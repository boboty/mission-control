import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

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

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: result.rows[0]?.last_seen_at || null,
      dataUpdatedAt: result.rows[0]?.last_seen_at || null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'agents',
        rows: result.rows,
        data: result.rows,
        meta,
      })
    );
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  } finally {
    await client.end();
  }
}
