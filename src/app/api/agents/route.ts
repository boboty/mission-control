import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT id, agent_key, display_name, state, last_seen_at
      FROM agents
      ORDER BY state DESC, last_seen_at DESC NULLS LAST
      LIMIT 20
    `);
    return NextResponse.json({ agents: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  } finally {
    await client.end();
  }
}
