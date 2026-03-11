import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

const AGENT_STATUS_TIMEOUT_MINUTES = Number(process.env.AGENT_STATUS_TIMEOUT_MINUTES || '10');

const AGENT_OVERRIDES: Record<string, { displayName?: string; description?: string }> = {
  main: {
    displayName: '鲍特',
    description: '主助理，负责 Telegram 主会话与团队协调',
  },
  feishu_main: {
    displayName: '道Q鲍特',
    description: '飞书办公助理，对外名为道Q鲍特，负责文档与办公流程',
  },
  agent_code: {
    displayName: '考德鲍特',
    description: '编码代理，负责研发与代码处理',
  },
  baotedu: {
    displayName: '鲍特度',
    description: '经济型子代理，承接低成本子任务',
  },
  agent_thinker: {
    displayName: '沉思鲍特',
    description: '深度推理代理，负责架构与决策思考',
  },
  agent_q: {
    displayName: '道Q鲍特',
    description: '轻量问答/协调代理',
  },
};

const KNOWN_TEAM_ROSTER = Object.entries(AGENT_OVERRIDES).map(([agent_key, value], index) => ({
  id: -(index + 1),
  agent_key,
  display_name: value.displayName || agent_key,
  description: value.description || null,
  state: 'offline',
  last_seen_at: null,
  current_task: null,
  status_source: 'roster',
  work_started_at: null,
  last_idle_at: null,
  presence: 'unknown',
}));

function normalizeAgentState(state: string | null | undefined) {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  return state;
}

function derivePresence(lastSeenAt: string | null | undefined, storedPresence: string | null | undefined) {
  if (!lastSeenAt) return storedPresence || 'unknown';
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;
  if (ageMs > timeoutMs) return 'offline';
  return storedPresence || 'online';
}

function deriveWorkState(state: string | null | undefined, lastSeenAt: string | null | undefined) {
  const normalized = normalizeAgentState(state);
  if (!lastSeenAt) return normalized;

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;

  if (ageMs > timeoutMs && (normalized === 'running' || normalized === 'active' || normalized === 'online')) {
    return 'idle';
  }

  return normalized;
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const result = await pool.query(`
      SELECT
        id,
        agent_key,
        display_name,
        description,
        state,
        last_seen_at,
        NULL::text AS current_task,
        'runtime'::text AS status_source,
        NULL::timestamptz AS work_started_at,
        NULL::timestamptz AS last_idle_at,
        'online'::text AS presence
      FROM agents
      ORDER BY last_seen_at DESC NULLS LAST
      LIMIT 20
    `);

    const merged = new Map<string, any>();

    for (const rosterRow of KNOWN_TEAM_ROSTER) {
      merged.set(rosterRow.agent_key, rosterRow);
    }

    for (const row of result.rows) {
      const override = AGENT_OVERRIDES[row.agent_key] || {};
      const work_state = deriveWorkState(row.state, row.last_seen_at);
      const presence = derivePresence(row.last_seen_at, row.presence);
      const legacyState = presence === 'offline' ? 'offline' : work_state;

      merged.set(row.agent_key, {
        ...(merged.get(row.agent_key) || {}),
        ...row,
        display_name: override.displayName || row.display_name,
        description: override.description || row.description,
        state: legacyState,
        work_state,
        presence,
        current_task: row.current_task || null,
        status_source: row.status_source || 'runtime',
        work_started_at: row.work_started_at || null,
        last_idle_at: row.last_idle_at || null,
      });
    }

    const agents = Array.from(merged.values()).sort((a, b) => {
      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: result.rows[0]?.last_seen_at || new Date().toISOString(),
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'agents',
        rows: agents,
        data: agents,
        meta,
        extra: {
          timeout_minutes: AGENT_STATUS_TIMEOUT_MINUTES,
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
