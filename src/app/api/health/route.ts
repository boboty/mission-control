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

    const snapshotsResult = await client.query(`
      SELECT id, blocked_count, pending_decisions, cron_ok, created_at
      FROM health_snapshots
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // 与任务列表口径对齐（未完成 + blocker=true）
    const taskAggregateResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'done' AND blocker = true) AS blocked_count,
        COUNT(*) FILTER (
          WHERE status != 'done'
            AND blocker = true
            AND NULLIF(BTRIM(next_action), '') IS NULL
        ) AS pending_decisions,
        MAX(updated_at) AS last_task_sync_at
      FROM tasks
    `);

    const live = taskAggregateResult.rows[0] || {};
    const latestSnapshot = snapshotsResult.rows[0];

    const nowMs = Date.now();
    const nowIso = new Date().toISOString();
    const staleThresholdMs = 6 * 60 * 60 * 1000;

    const mergedLatest = {
      id: latestSnapshot?.id ?? 0,
      blocked_count: parseInt(live.blocked_count, 10) || 0,
      pending_decisions: parseInt(live.pending_decisions, 10) || 0,
      cron_ok: latestSnapshot?.cron_ok ?? true,
      created_at: latestSnapshot?.created_at ?? live.last_task_sync_at ?? new Date().toISOString(),
      // last_sync_at: when this API successfully fetched from Supabase
      last_sync_at: nowIso,
      // data_updated_at: last time underlying tasks data changed
      data_updated_at: live.last_task_sync_at ?? null,
    };

    const health = [
      {
        ...mergedLatest,
        is_stale: mergedLatest.data_updated_at
          ? nowMs - new Date(mergedLatest.data_updated_at).getTime() > staleThresholdMs
          : false,
      },
      ...snapshotsResult.rows.slice(1).map((row: any) => ({
        ...row,
        last_sync_at: row.created_at,
        data_updated_at: row.created_at,
        is_stale: nowMs - new Date(row.created_at).getTime() > staleThresholdMs,
      })),
    ];

    return NextResponse.json({
      health,
      count: health.length,
      data_source: 'supabase',
      last_sync_at: nowIso,
      data_updated_at: mergedLatest.data_updated_at,
    });
  } catch (error) {
    console.error('Failed to fetch health snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch health snapshots' }, { status: 500 });
  } finally {
    await client.end();
  }
}
