import { NextResponse } from 'next/server';
import { Client } from 'pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // 决策口径：所有 blocker=true 且未完成任务
    const decisionsQuery = `
      SELECT 
        id,
        title,
        status,
        priority,
        owner,
        blocker,
        next_action,
        due_at,
        updated_at,
        source
      FROM tasks
      WHERE status != 'done'
        AND blocker = true
      ORDER BY 
        updated_at DESC NULLS LAST,
        due_at ASC NULLS LAST
      LIMIT 50
    `;

    const decisionsResult = await client.query(decisionsQuery);

    // 汇总口径与列表保持一致
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE due_at < NOW()) as overdue,
        COUNT(*) FILTER (WHERE blocker = true) as blocked,
        COUNT(*) FILTER (WHERE NULLIF(BTRIM(next_action), '') IS NOT NULL) as with_next_action,
        COUNT(*) FILTER (WHERE NULLIF(BTRIM(next_action), '') IS NULL) as missing_next_action,
        MAX(updated_at) as data_updated_at
      FROM tasks
      WHERE status != 'done'
        AND blocker = true
    `;

    const summaryResult = await client.query(summaryQuery);
    const now = new Date().toISOString();

    const decisions = decisionsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      owner: row.owner,
      blocker: row.blocker,
      next_action: row.next_action,
      due_at: row.due_at,
      updated_at: row.updated_at,
      source: row.source,
    }));

    const summary = {
      total: parseInt(summaryResult.rows[0].total) || 0,
      highPriority: parseInt(summaryResult.rows[0].high_priority) || 0,
      overdue: parseInt(summaryResult.rows[0].overdue) || 0,
      blocked: parseInt(summaryResult.rows[0].blocked) || 0,
      withNextAction: parseInt(summaryResult.rows[0].with_next_action) || 0,
      missingNextAction: parseInt(summaryResult.rows[0].missing_next_action) || 0,
    };

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: now,
      dataUpdatedAt: summaryResult.rows[0].data_updated_at,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'decisions',
        rows: decisions,
        data: { decisions, summary },
        meta,
        extra: { summary },
      })
    );
  } catch (error) {
    console.error('Failed to fetch decisions:', error);
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 });
  } finally {
    await client.end();
  }
}
