import { NextResponse } from 'next/server';
import { getPgPool } from '../../_lib/pg';

const ALLOWED_STATES = new Set(['running', 'idle', 'active', 'online', 'offline', 'blocked']);

function normalizeState(state: string | null | undefined) {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  return ALLOWED_STATES.has(state) ? state : 'idle';
}

function derivePresence(state: string) {
  if (state === 'offline') return 'offline';
  return 'online';
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { agent_key, state, display_name, description, current_task, status_source } = await request.json();

    if (!agent_key || !state) {
      return NextResponse.json({ error: 'Missing agent_key or state' }, { status: 400 });
    }

    const pool = getPgPool(databaseUrl);
    const normalizedState = normalizeState(state);
    const presence = derivePresence(normalizedState);
    const workStartedAt = normalizedState === 'running' ? 'NOW()' : 'agents.work_started_at';
    const lastIdleAt = normalizedState === 'idle' ? 'NOW()' : 'agents.last_idle_at';

    await pool.query(
      `INSERT INTO agents (
         agent_key, display_name, description, state, presence, current_task, status_source, last_seen_at, work_started_at, last_idle_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), CASE WHEN $4 = 'running' THEN NOW() ELSE NULL END, CASE WHEN $4 = 'idle' THEN NOW() ELSE NULL END)
       ON CONFLICT (agent_key) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
         description = COALESCE(EXCLUDED.description, agents.description),
         state = EXCLUDED.state,
         presence = EXCLUDED.presence,
         current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
         status_source = COALESCE(EXCLUDED.status_source, agents.status_source, 'runtime'),
         last_seen_at = NOW(),
         work_started_at = ${workStartedAt},
         last_idle_at = ${lastIdleAt}`,
      [
        agent_key,
        display_name || agent_key,
        description || null,
        normalizedState,
        presence,
        current_task || null,
        status_source || 'runtime',
      ]
    );

    return NextResponse.json({
      success: true,
      agent_key,
      state: normalizedState,
      presence,
      current_task: current_task || null,
      status_source: status_source || 'runtime',
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
