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
      SELECT id, item_name, stage, owner, due_at, updated_at
      FROM pipelines
      ORDER BY due_at ASC NULLS LAST
      LIMIT 20
    `);
    return NextResponse.json({
      pipelines: result.rows,
      count: result.rows.length,
      data_source: 'supabase',
      last_sync_at: result.rows[0]?.updated_at || null,
    });
  } catch (error) {
    console.error('Failed to fetch pipelines:', error);
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
  } finally {
    await client.end();
  }
}
