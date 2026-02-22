import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  // 解析查询参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const status = searchParams.get('status'); // 状态筛选：todo/in_progress/blocked/done
  const search = searchParams.get('search'); // 搜索：按标题或 ID
  const sortBy = searchParams.get('sortBy') || 'default'; // 排序：default/priority/dueDate/status

  // 验证参数
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    // 构建 WHERE 条件
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 状态筛选
    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    // 搜索（标题或 ID）
    if (search) {
      // 检查是否是数字 ID
      const searchId = parseInt(search, 10);
      if (!isNaN(searchId)) {
        whereClauses.push(`(id = $${paramIndex} OR title ILIKE $${paramIndex + 1})`);
        queryParams.push(searchId, `%${search}%`);
        paramIndex += 2;
      } else {
        whereClauses.push(`title ILIKE $${paramIndex}`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 构建 ORDER BY
    let orderByClause = '';
    switch (sortBy) {
      case 'priority':
        orderByClause = 'ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_at ASC NULLS LAST';
        break;
      case 'dueDate':
        orderByClause = 'ORDER BY due_at ASC NULLS LAST';
        break;
      case 'status':
        orderByClause = 'ORDER BY CASE status WHEN \'todo\' THEN 1 WHEN \'in_progress\' THEN 2 WHEN \'blocked\' THEN 3 WHEN \'done\' THEN 4 ELSE 5 END';
        break;
      default:
        orderByClause = 'ORDER BY CASE status WHEN \'done\' THEN 3 WHEN \'in_progress\' THEN 2 ELSE 1 END, CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_at ASC NULLS LAST';
    }

    // 查询总数（用于分页）
    const countQuery = `SELECT COUNT(*) as total FROM tasks ${whereClause}`;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // 查询数据
    const dataQuery = `
      SELECT id, title, status, priority, owner, blocker, next_action, due_at, source, updated_at
      FROM tasks
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataParams = [...queryParams, safePageSize, offset];
    const result = await client.query(dataQuery, dataParams);

    return NextResponse.json({
      tasks: result.rows,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize),
        hasMore: offset + result.rows.length < total,
      },
      filters: {
        status,
        search,
        sortBy,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  } finally {
    await client.end();
  }
}
