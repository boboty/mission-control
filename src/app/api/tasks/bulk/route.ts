import { NextResponse } from 'next/server';
import { getPgPool } from '../../_lib/pg';

export async function PATCH(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { taskIds, status, priority, owner, nextAction, dueAt, actor = 'system', meta } = body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: 'taskIds array is required' }, { status: 400 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    await pool.query('BEGIN');

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
        updatedCount: 0,
        message: 'No fields to update',
      });
    }

    // Create array of task IDs for IN clause
    const taskIdArray = taskIds.map((id: number) => `$${paramIndex}`);
    values.push(...taskIds);
    const arrayParamIndex = paramIndex;
    paramIndex += taskIds.length;

    const updateQuery = `UPDATE tasks SET ${updates.join(', ')} WHERE id IN (${taskIdArray.join(', ')})`;
    
    const result = await pool.query(updateQuery, values);

    // Insert event records for status changes
    if (status !== undefined) {
      // Get the old statuses for all affected tasks
      const oldTasksResult = await pool.query(
        'SELECT id, status FROM tasks WHERE id = ANY($1)',
        [taskIds]
      );

      for (const oldTask of oldTasksResult.rows) {
        if (oldTask.status !== status) {
          await pool.query(
            `INSERT INTO task_events (task_id, event_type, from_status, to_status, actor, meta, created_at)
             VALUES ($1, 'status_change', $2, $3, $4, $5, NOW())`,
            [oldTask.id, oldTask.status, status, actor, meta ? JSON.stringify(meta) : null]
          );
        }
      }
    }

    await pool.query('COMMIT');

    return NextResponse.json({
      success: true,
      updatedCount: result.rowCount,
      taskIds,
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
    console.error('Failed to bulk update tasks:', error);
    return NextResponse.json({ error: 'Failed to bulk update tasks' }, { status: 500 });
  } finally {
    // pool: do not end per-request
  }
}
