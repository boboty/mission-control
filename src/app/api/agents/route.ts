import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

const AGENT_STATUS_TIMEOUT_MINUTES = Number(process.env.AGENT_STATUS_TIMEOUT_MINUTES || '10');
const OBSERVED_BUSY_WINDOW_MINUTES = Number(process.env.AGENT_OBSERVED_BUSY_WINDOW_MINUTES || '180');

const AGENT_OVERRIDES: Record<string, { displayName?: string; description?: string }> = {
  main: {
    displayName: '鲍特',
    description: '主助理，负责 Telegram 主会话与团队协调',
  },
  feishu_main: {
    displayName: '笨燕',
    description: '飞书办公助理，负责文档与办公流程',
  },
  agent_code: {
    displayName: '考德鲍特',
    description: '编码代理，负责研发与代码处理',
  },
  baotedu: {
    displayName: '鲍特度',
    description: '经济型子代理，承接低成本子任务',
  },
};

function normalizeAgentState(state: string | null | undefined) {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  return state;
}

function deriveAgentState(state: string | null | undefined, lastSeenAt: string | null | undefined) {
  const normalized = normalizeAgentState(state);
  if (!lastSeenAt) return normalized;

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;

  if (ageMs > timeoutMs && (normalized === 'running' || normalized === 'active' || normalized === 'online')) {
    return 'idle';
  }

  return normalized;
}

function getObservedBusyKeys() {
  const raw = process.env.MISSION_CONTROL_BUSY_AGENTS || process.env.OPENCLAW_BUSY_AGENTS || '';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function applyObservedBusyState(agentKey: string, derivedState: string, lastSeenAt: string | null | undefined) {
  const busyKeys = getObservedBusyKeys();
  const ageMs = lastSeenAt ? Date.now() - new Date(lastSeenAt).getTime() : Number.POSITIVE_INFINITY;
  const busyWindowMs = OBSERVED_BUSY_WINDOW_MINUTES * 60 * 1000;

  if (busyKeys.has(agentKey) && ageMs <= busyWindowMs) {
    return 'running';
  }

  return derivedState;
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const result = await pool.query(`
      SELECT id, agent_key, display_name, description, state, last_seen_at
      FROM agents
      ORDER BY 
        last_seen_at DESC NULLS LAST,
        last_seen_at DESC NULLS LAST
      LIMIT 20
    `);

    const agents = result.rows.map((row) => {
      const override = AGENT_OVERRIDES[row.agent_key] || {};
      const derivedState = deriveAgentState(row.state, row.last_seen_at);
      const state = applyObservedBusyState(row.agent_key, derivedState, row.last_seen_at);
      return {
        ...row,
        display_name: override.displayName || row.display_name,
        description: override.description || row.description,
        state,
      };
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
