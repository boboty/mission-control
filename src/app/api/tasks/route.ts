import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, buildPagination, withLegacyListShape } from '../_lib/response';

export async function PATCH(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { taskId, status, priority, owner, nextAction, dueAt, actor = 'system', meta } = body;

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect

    await pool.query('BEGIN');

    // Get current task
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const oldTask = taskResult.rows[0];
    const fromStatus = oldTask.status;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }
    if (owner !== undefined) {
      updates.push(`owner = $${paramIndex}`);
      values.push(owner);
      paramIndex++;
    }
    if (nextAction !== undefined) {
      updates.push(`next_action = $${paramIndex}`);
      values.push(nextAction);
      paramIndex++;
    }
    if (dueAt !== undefined) {
      updates.push(`due_at = $${paramIndex}`);
      values.push(dueAt);
      paramIndex++;
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at would be set, nothing to update
      await pool.query('ROLLBACK');
      return NextResponse.json({
        success: true,
        taskId,
        message: 'No fields to update',
      });
    }

    const updateQuery = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    values.push(taskId);

    await pool.query(updateQuery, values);

    // Insert event record if status changed
    if (status !== undefined && status !== fromStatus) {
      await pool.query(
        `INSERT INTO task_events (task_id, event_type, from_status, to_status, actor, meta, created_at)
         VALUES ($1, 'status_change', $2, $3, $4, $5, NOW())`,
        [taskId, fromStatus, status, actor, meta ? JSON.stringify(meta) : null]
      );
    }

    await pool.query('COMMIT');

    return NextResponse.json({
      success: true,
      taskId,
      fromStatus,
      toStatus: status || fromStatus,
      updated: {
        status,
        priority,
        owner,
        nextAction,
        dueAt,
      },
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Failed to update task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  } finally {
    // pool: do not end per-request

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

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect


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
    const countResult = await pool.query(countQuery, queryParams);
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
    const result = await pool.query(dataQuery, dataParams);

    const pagination = buildPagination({
      page: safePage,
      pageSize: safePageSize,
      total,
    });
    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: now,
      dataUpdatedAt: countResult.rows[0].data_updated_at,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'tasks',
        rows: result.rows,
        data: {
          tasks: result.rows,
          pagination,
          filters: {
            status,
            search,
            sortBy,
          },
        },
        meta,
        pagination,
        extra: {
          filters: {
            status,
            search,
            sortBy,
          },
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}
