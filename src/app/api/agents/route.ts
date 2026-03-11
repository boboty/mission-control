import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

// 状态过期时间（分钟）- 超过此时间未上报视为离线
const AGENT_STATUS_TIMEOUT_MINUTES = Number(process.env.AGENT_STATUS_TIMEOUT_MINUTES || '10');

// 活跃时间阈值（小时）- 用于判断 freshness
const FRESHNESS_FRESH_HOURS = 1;
const FRESHNESS_RECENT_HOURS = 24;

// 已知团队 roster 配置（硬编码的完整名单）
const AGENT_OVERRIDES: Record<string, { displayName?: string; description?: string; role?: string; channel?: string }> = {
  main: {
    displayName: '鲍特',
    description: '主助理，负责 Telegram 主会话与团队协调',
    role: '主助理',
    channel: 'Telegram',
  },
  feishu_main: {
    displayName: '道 Q 鲍特',
    description: '飞书办公助理，对外名为道 Q 鲍特，负责文档与办公流程',
    role: '办公助理',
    channel: 'Feishu',
  },
  agent_code: {
    displayName: '考德鲍特',
    description: '编码代理，负责研发与代码处理',
    role: '编码代理',
    channel: 'OpenClaw',
  },
  baotedu: {
    displayName: '鲍特度',
    description: '经济型子代理，承接低成本子任务',
    role: '子代理',
    channel: 'OpenClaw',
  },
  agent_thinker: {
    displayName: '沉思鲍特',
    description: '深度推理代理，负责架构与决策思考',
    role: '推理代理',
    channel: 'OpenClaw',
  },
  agent_q: {
    displayName: '道 Q 鲍特',
    description: '轻量问答/协调代理',
    role: '问答代理',
    channel: 'OpenClaw',
  },
};

// 完整的团队 roster（排除 boss）
const KNOWN_TEAM_ROSTER = Object.entries(AGENT_OVERRIDES)
  .filter(([key]) => key !== 'boss')
  .map(([agent_key, value], index) => ({
    id: -(index + 1),
    agent_key,
    display_name: value.displayName || agent_key,
    description: value.description || null,
    state: 'offline' as const,
    last_seen_at: null as string | null,
    current_task: null as string | null,
    status_source: 'roster' as const,
    work_started_at: null as string | null,
    last_idle_at: null as string | null,
    presence: 'unknown' as const,
  }));

/**
 * 标准化 agent 状态
 * working -> running
 * active/online -> online
 * idle/blocked/offline -> 保持原样
 */
function normalizeAgentState(state: string | null | undefined): string {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  if (state === 'active' || state === 'online') return 'online';
  return state;
}

/**
 * 推导 presence 状态（在线/离线/未知）
 * 基于 last_seen_at 和超时阈值
 */
function derivePresence(lastSeenAt: string | null | undefined, storedPresence: string | null | undefined): 'online' | 'offline' | 'unknown' {
  if (!lastSeenAt) {
    return storedPresence === 'offline' ? 'offline' : 'unknown';
  }
  
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;
  
  if (ageMs > timeoutMs) return 'offline';
  return 'online';
}

/**
 * 推导工作状态（running/idle/offline）
 * 结合 state 字段和 last_seen_at 的时效性
 */
function deriveWorkState(
  state: string | null | undefined,
  lastSeenAt: string | null | undefined,
  presence: 'online' | 'offline' | 'unknown'
): string {
  const normalized = normalizeAgentState(state);
  
  // 如果没有 last_seen_at，使用标准化后的状态
  if (!lastSeenAt) return normalized;
  
  // 如果已判定为离线，返回 offline
  if (presence === 'offline') return 'offline';
  
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;
  
  // 超时但状态显示为运行中 -> 修正为 idle
  if (ageMs > timeoutMs && (normalized === 'running' || normalized === 'online')) {
    return 'idle';
  }
  
  return normalized;
}

/**
 * 计算 freshness 级别
 */
function getFreshnessLevel(lastSeenAt: string | null | undefined): 'fresh' | 'recent' | 'stale' | 'unknown' {
  if (!lastSeenAt) return 'unknown';
  
  const hours = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60);
  
  if (hours <= FRESHNESS_FRESH_HOURS) return 'fresh';
  if (hours <= FRESHNESS_RECENT_HOURS) return 'recent';
  return 'stale';
}

/**
 * 获取 freshness 显示标签
 */
function getFreshnessLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return '未知';
  
  const hours = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60);
  
  if (hours < 1) return '1 小时内';
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    // 从数据库获取所有 agent 记录
    const result = await pool.query(`
      SELECT
        id,
        agent_key,
        display_name,
        description,
        state,
        last_seen_at,
        current_task,
        status_source,
        work_started_at,
        last_idle_at,
        presence
      FROM agents
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 50
    `);

    // 使用 Map 合并 roster 和 runtime 数据
    const merged = new Map<string, any>();

    // 1. 先加入已知 roster（确保完整名单）
    for (const rosterRow of KNOWN_TEAM_ROSTER) {
      merged.set(rosterRow.agent_key, { ...rosterRow });
    }

    // 2. 合并数据库中的 runtime 数据
    for (const row of result.rows) {
      const override = AGENT_OVERRIDES[row.agent_key] || {};
      const presence = derivePresence(row.last_seen_at, row.presence);
      const workState = deriveWorkState(row.state, row.last_seen_at, presence);
      const freshnessLevel = getFreshnessLevel(row.last_seen_at);
      const freshnessLabel = getFreshnessLabel(row.last_seen_at);

      const mergedAgent = {
        ...(merged.get(row.agent_key) || {}),
        ...row,
        display_name: override.displayName || row.display_name || row.agent_key,
        description: override.description || row.description || null,
        state: workState, // 使用推导后的工作状态
        work_state: workState,
        presence,
        freshness_level: freshnessLevel,
        freshness_label: freshnessLabel,
        current_task: row.current_task || null,
        status_source: row.status_source || 'runtime',
        work_started_at: row.work_started_at || null,
        last_idle_at: row.last_idle_at || null,
      };

      merged.set(row.agent_key, mergedAgent);
    }

    // 3. 转换为数组并排序（在线优先，然后按最后活跃时间）
    const agents = Array.from(merged.values()).sort((a, b) => {
      // 在线优先于离线
      const aOnline = a.presence === 'online' ? 1 : 0;
      const bOnline = b.presence === 'online' ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      
      // 然后按最后活跃时间排序
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: agents[0]?.last_seen_at || new Date().toISOString(),
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'agents',
        rows: agents,
        data: agents,
        meta,
        extra: {
          timeout_minutes: AGENT_STATUS_TIMEOUT_MINUTES,
          roster_count: KNOWN_TEAM_ROSTER.length,
          runtime_count: result.rows.length,
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
