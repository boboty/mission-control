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
      SELECT id, blocked_count, pending_decisions, cron_ok, created_at
      FROM health_snapshots
      ORDER BY created_at DESC
      LIMIT 10
    `);
    return NextResponse.json({ health: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Failed to fetch health snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch health snapshots' }, { status: 500 });
  } finally {
    await client.end();
  }
}
