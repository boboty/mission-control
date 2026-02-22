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
      SELECT id, title, starts_at, ends_at, type, source
      FROM events
      WHERE starts_at >= NOW() - INTERVAL '1 day'
      ORDER BY starts_at ASC
      LIMIT 20
    `);
    return NextResponse.json({ events: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  } finally {
    await client.end();
  }
}
