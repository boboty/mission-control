import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function PATCH(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { taskId, status, actor = 'system', meta } = body;

  if (!taskId || !status) {
    return NextResponse.json({ error: 'taskId and status are required' }, { status: 400 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query('BEGIN');

    // Get current task status
    const taskResult = await client.query('SELECT status FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const fromStatus = taskResult.rows[0].status;

    // Update task status
    await client.query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, taskId]
    );

    // Insert event record
    await client.query(
      `INSERT INTO task_events (task_id, event_type, from_status, to_status, actor, meta, created_at)
       VALUES ($1, 'status_change', $2, $3, $4, $5, NOW())`,
      [taskId, fromStatus, status, actor, meta ? JSON.stringify(meta) : null]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      taskId,
      fromStatus,
      toStatus: status,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update task status:', error);
    return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 });
  } finally {
    await client.end();
  }
}

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'default';

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();

    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClauses.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
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

    const countQuery = `SELECT COUNT(*) as total, MAX(updated_at) as data_updated_at FROM tasks ${whereClause}`;
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    const now = new Date().toISOString();

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
      data_source: 'supabase',
      // last_sync_at: when this API successfully fetched from Supabase
      last_sync_at: now,
      // data_updated_at: last time underlying tasks data changed
      data_updated_at: countResult.rows[0].data_updated_at,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  } finally {
    await client.end();
  }
}
