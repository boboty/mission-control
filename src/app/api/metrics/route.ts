import { NextResponse } from 'next/server';
import { createPgClient } from '../_lib/pg';
import { buildMeta } from '../_lib/response';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const client = createPgClient(databaseUrl);

  try {
    await client.connect();

    const currentMetrics = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE blocker = true AND status != 'done') as blocked,
        COUNT(*) FILTER (WHERE blocker = true AND status != 'done') as pending,
        MAX(updated_at) as data_updated_at
      FROM tasks
    `);

    const historicalMetrics = await client.query(`
      SELECT blocked_count, pending_decisions
      FROM health_snapshots
      ORDER BY created_at DESC
      OFFSET 1 LIMIT 1
    `);

    const current = currentMetrics.rows[0];
    const historical = historicalMetrics.rows[0];
    const now = new Date().toISOString();

    const currentBlocked = parseInt(current.blocked, 10) || 0;
    const currentPending = parseInt(current.pending, 10) || 0;

    const trends = {
      total: 0,
      in_progress: 0,
      blocked: historical ? currentBlocked - (historical.blocked_count || 0) : 0,
      pending: historical ? currentPending - (historical.pending_decisions || 0) : 0,
    };

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: now,
      dataUpdatedAt: current.data_updated_at,
    });

    return NextResponse.json({
      data: {
        metrics: {
          total: parseInt(current.total, 10) || 0,
          inProgress: parseInt(current.in_progress, 10) || 0,
          blocked: currentBlocked,
          pending: currentPending,
        },
        trends: {
          total: trends.total,
          inProgress: trends.in_progress,
          blocked: trends.blocked,
          pending: trends.pending,
        },
      },
      meta,
      metrics: {
        total: parseInt(current.total, 10) || 0,
        inProgress: parseInt(current.in_progress, 10) || 0,
        blocked: currentBlocked,
        pending: currentPending,
      },
      trends: {
        total: trends.total,
        inProgress: trends.in_progress,
        blocked: trends.blocked,
        pending: trends.pending,
      },
      data_source: meta.source,
      last_sync_at: meta.last_sync_at,
      data_updated_at: meta.data_updated_at,
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  } finally {
    await client.end();
  }
}
