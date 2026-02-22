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

    // Current metrics
    const currentMetrics = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE blocker = true AND status != 'done') as blocked,
        COUNT(*) FILTER (WHERE status = 'todo') as todo
      FROM tasks
    `);

    // Metrics from the previous snapshot (health_snapshots as historical reference)
    const historicalMetrics = await client.query(`
      SELECT blocked_count, pending_decisions
      FROM health_snapshots
      ORDER BY created_at DESC
      OFFSET 1 LIMIT 1
    `);

    // Get latest health snapshot for pending decisions
    const latestHealth = await client.query(`
      SELECT blocked_count, pending_decisions
      FROM health_snapshots
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const current = currentMetrics.rows[0];
    const historical = historicalMetrics.rows[0];
    const pending = latestHealth.rows[0]?.pending_decisions || 0;

    // Calculate trends (compare with historical when available)
    // Note: health_snapshots currently only stores blocked_count & pending_decisions.
    const trends = {
      total: 0,
      in_progress: 0,
      blocked: historical ? current.blocked - (historical.blocked_count || 0) : 0,
      pending: historical ? pending - (historical.pending_decisions || 0) : 0,
    };

    return NextResponse.json({
      metrics: {
        total: parseInt(current.total) || 0,
        inProgress: parseInt(current.in_progress) || 0,
        blocked: parseInt(current.blocked) || 0,
        pending: pending,
      },
      trends: {
        total: trends.total,
        inProgress: trends.in_progress,
        blocked: trends.blocked,
        pending: trends.pending,
      },
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  } finally {
    await client.end();
  }
}
