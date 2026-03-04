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
      SELECT id, title, category, ref_path, summary, happened_at
      FROM memories
      ORDER BY happened_at DESC NULLS LAST
      LIMIT 20
    `);

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: result.rows[0]?.happened_at || null,
      dataUpdatedAt: result.rows[0]?.happened_at || null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'memories',
        rows: result.rows,
        data: result.rows,
        meta,
      })
    );
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}
