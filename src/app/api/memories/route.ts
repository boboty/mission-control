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
      SELECT id, title, category, ref_path, summary, happened_at
      FROM memories
      ORDER BY happened_at DESC NULLS LAST
      LIMIT 20
    `);
    return NextResponse.json({ memories: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  } finally {
    await client.end();
  }
}
