import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, buildPagination, withLegacyListShape } from '../_lib/response';

// 记录任务变更事件
async function recordTaskEvent(
  pool: any,
  taskId: number,
  eventType: string,
  oldValue: string | null,
  newValue: string,
  actor: string,
  comment?: string | null,
  meta?: Record<string, any>
) {
  await pool.query(
    `INSERT INTO task_events (task_id, event_type, old_value, new_value, actor, comment, meta, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [taskId, eventType, oldValue, newValue, actor, comment, meta ? JSON.stringify(meta) : null]
  );
}

export async function PATCH(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { taskId, status, priority, owner, nextAction, dueAt, linkedPipelineId, linkedEventId, actor = 'system', meta, comment } = body;

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
    if (linkedPipelineId !== undefined) {
      updates.push(`linked_pipeline_id = $${paramIndex}`);
      values.push(linkedPipelineId);
      paramIndex++;
    }
    if (linkedEventId !== undefined) {
      updates.push(`linked_event_id = $${paramIndex}`);
      values.push(linkedEventId);
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

    // Record events for each changed field
    if (status !== undefined && status !== oldTask.status) {
      await recordTaskEvent(
        pool,
        taskId,
        'status_change',
        oldTask.status,
        status,
        actor,
        null,
        meta
      );
    }

    if (priority !== undefined && priority !== oldTask.priority) {
      await recordTaskEvent(
        pool,
        taskId,
        'priority_change',
        oldTask.priority || 'none',
        priority,
        actor,
        null,
        meta
      );
    }

    if (owner !== undefined && owner !== oldTask.owner) {
      await recordTaskEvent(
        pool,
        taskId,
        'owner_change',
        oldTask.owner || 'unassigned',
        owner || 'unassigned',
        actor,
        null,
        meta
      );
    }

    if (nextAction !== undefined && nextAction !== oldTask.next_action) {
      await recordTaskEvent(
        pool,
        taskId,
        'next_action_change',
        oldTask.next_action,
        nextAction,
        actor,
        null,
        meta
      );
    }

    if (dueAt !== undefined && dueAt !== oldTask.due_at) {
      await recordTaskEvent(
        pool,
        taskId,
        'due_date_change',
        oldTask.due_at,
        dueAt,
        actor,
        null,
        meta
      );
    }

    // Add comment if provided
    if (comment) {
      await recordTaskEvent(
        pool,
        taskId,
        'comment',
        null,
        'comment',
        actor,
        comment,
        meta
      );
    }

    await pool.query('COMMIT');

    return NextResponse.json({
      success: true,
      taskId,
      updated: {
        status,
        priority,
        owner,
        nextAction,
        dueAt,
        linkedPipelineId,
        linkedEventId,
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

// GET endpoint to fetch task timeline
export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const timeline = searchParams.get('timeline');

  const pool = getPgPool(databaseUrl);

  try {
    // If requesting timeline for a specific task
    if (taskId && timeline === 'true') {
      const result = await pool.query(
        `SELECT id, task_id, event_type, old_value, new_value, actor, comment, meta, created_at
         FROM task_events
         WHERE task_id = $1
         ORDER BY created_at DESC`,
        [taskId]
      );

      return NextResponse.json({
        success: true,
        taskId,
        events: result.rows.map(row => ({
          id: row.id,
          task_id: row.task_id,
          event_type: row.event_type,
          old_value: row.old_value,
          new_value: row.new_value,
          actor: row.actor,
          comment: row.comment,
          meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta,
          created_at: row.created_at,
        })),
      });
    }

    // Default: return tasks list (existing behavior)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'default';

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const offset = (safePage - 1) * safePageSize;

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


