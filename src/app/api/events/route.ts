import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect

    const result = await pool.query(`
      SELECT id, title, starts_at, ends_at, type, source
      FROM events
      WHERE starts_at >= NOW() - INTERVAL '1 day'
      ORDER BY starts_at ASC
      LIMIT 20
    `);

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: result.rows[0]?.starts_at || null,
      dataUpdatedAt: result.rows[0]?.starts_at || null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'events',
        rows: result.rows,
        data: result.rows,
        meta,
      })
    );
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}
