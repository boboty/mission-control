import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

const AGENT_STATUS_TIMEOUT_MINUTES = Number(process.env.AGENT_STATUS_TIMEOUT_MINUTES || '10');

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
      const state = deriveAgentState(row.state, row.last_seen_at);
      return {
        ...row,
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
