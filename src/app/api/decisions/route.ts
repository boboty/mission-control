import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // 查询待决策项（默认口径）：blocked 优先，排除已完成
    // 说明：后续如需拓展，可加上“高优 todo 且 next_action 非空”作为次级入口。
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
      WHERE blocker = true
        AND status != 'done'
      ORDER BY 
        updated_at DESC NULLS LAST,
        due_at ASC NULLS LAST
      LIMIT 50
    `;

    const decisionsResult = await client.query(decisionsQuery);

    // 查询统计信息（排除已完成）
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE due_at < NOW()) as overdue,
        COUNT(*) FILTER (WHERE blocker = true AND status != 'done') as blocked
      FROM tasks
      WHERE blocker = true
        AND status != 'done'
    `;

    const summaryResult = await client.query(summaryQuery);

    // 转换数据格式
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
    };

    return NextResponse.json({
      decisions,
      summary,
      count: decisions.length,
    });
  } catch (error) {
    console.error('Failed to fetch decisions:', error);
    return NextResponse.json({ error: 'Failed to fetch decisions' }, { status: 500 });
  } finally {
    await client.end();
  }
}
