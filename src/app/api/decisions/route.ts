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

    // 查询待决策项：状态为 todo 且有下一步行动的任务
    // 或者优先级为 high 的任务
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
      WHERE 
        (status = 'todo' AND next_action IS NOT NULL AND next_action != '')
        OR priority = 'high'
        OR blocker = true
      ORDER BY 
        CASE priority WHEN 'high' THEN 1 ELSE 2 END,
        CASE WHEN blocker = true THEN 0 ELSE 1 END,
        due_at ASC NULLS LAST
      LIMIT 50
    `;

    const decisionsResult = await client.query(decisionsQuery);

    // 查询统计信息
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE due_at < NOW()) as overdue,
        COUNT(*) FILTER (WHERE blocker = true) as blocked
      FROM tasks
      WHERE 
        (status = 'todo' AND next_action IS NOT NULL AND next_action != '')
        OR priority = 'high'
        OR blocker = true
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
