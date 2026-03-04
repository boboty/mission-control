import { NextResponse } from 'next/server';
import { getPgPool } from '../../_lib/pg';

export async function POST(request: Request) {
  try {
    const { agent_key, state } = await request.json();
    
    if (!agent_key || !state) {
      return NextResponse.json({ error: 'Missing agent_key or state' }, { status: 400 });
    }

    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:P8L7%3AEWcf%3AxtKvz@db.lzhgwgwqldflbozvhuot.supabase.co:5432/postgres';
    const pool = getPgPool(databaseUrl);

    // pool is lazy; no explicit connect

    await pool.query(
      'UPDATE agents SET state = $1, last_seen_at = NOW() WHERE agent_key = $2',
      [state, agent_key]
    );
    // pool: do not end per-request


    return NextResponse.json({ success: true, agent_key, state });
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
