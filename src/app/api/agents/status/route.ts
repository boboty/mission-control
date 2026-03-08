import { NextResponse } from 'next/server';
import { getPgPool } from '../../_lib/pg';

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { agent_key, state, display_name, description } = await request.json();

    if (!agent_key || !state) {
      return NextResponse.json({ error: 'Missing agent_key or state' }, { status: 400 });
    }

    const pool = getPgPool(databaseUrl);
    const normalizedState = state === 'working' ? 'running' : state;

    await pool.query(
      `INSERT INTO agents (agent_key, display_name, description, state, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (agent_key) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
         description = COALESCE(EXCLUDED.description, agents.description),
         state = EXCLUDED.state,
         last_seen_at = NOW()`,
      [agent_key, display_name || agent_key, description || null, normalizedState]
    );

    return NextResponse.json({ success: true, agent_key, state: normalizedState });
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
