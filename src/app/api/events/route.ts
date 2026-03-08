import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, buildPagination, withLegacyListShape } from '../_lib/response';

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const type = searchParams.get('type');
  const source = searchParams.get('source');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const view = searchParams.get('view') || 'upcoming';
  const tz = searchParams.get('tz') || 'UTC';

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect

    const whereClauses: string[] = [];
    const queryParams: Array<string | number> = [];
    let paramIndex = 1;

    if (view === 'upcoming' && !from) {
      whereClauses.push(`starts_at >= NOW() - INTERVAL '1 day'`);
    }

    if (type) {
      whereClauses.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (source) {
      whereClauses.push(`source = $${paramIndex}`);
      queryParams.push(source);
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

    if (from) {
      if (isDateOnly(from)) {
        whereClauses.push(`starts_at >= ($${paramIndex}::date::timestamp AT TIME ZONE $${paramIndex + 1})`);
        queryParams.push(from, tz);
        paramIndex += 2;
      } else {
        whereClauses.push(`starts_at >= $${paramIndex}::timestamptz`);
        queryParams.push(from);
        paramIndex++;
      }
    }

    if (to) {
      if (isDateOnly(to)) {
        whereClauses.push(`starts_at < (($${paramIndex}::date + INTERVAL '1 day')::timestamp AT TIME ZONE $${paramIndex + 1})`);
        queryParams.push(to, tz);
        paramIndex += 2;
      } else {
        whereClauses.push(`starts_at <= $${paramIndex}::timestamptz`);
        queryParams.push(to);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) as total, MAX(starts_at) as data_updated_at FROM events ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Fetch events with linked task IDs (as array)
    const dataQuery = `
      SELECT e.id, e.title, e.starts_at, e.ends_at, e.type, e.source,
             COALESCE(ARRAY_AGG(t.id) FILTER (WHERE t.id IS NOT NULL), ARRAY[]::INTEGER[]) as linked_task_ids
      FROM events e
      LEFT JOIN tasks t ON t.linked_event_id = e.id
      ${whereClause}
      GROUP BY e.id
      ORDER BY starts_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const result = await pool.query(dataQuery, [...queryParams, safePageSize, offset]);
    const now = new Date().toISOString();
    const pagination = buildPagination({
      page: safePage,
      pageSize: safePageSize,
      total,
    });

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: now,
      dataUpdatedAt: countResult.rows[0]?.data_updated_at || null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'events',
        rows: result.rows,
        data: {
          events: result.rows,
          pagination,
          filters: {
            type,
            source,
            search,
            from,
            to,
            view,
            tz,
          },
        },
        meta,
        pagination,
        extra: {
          filters: {
            type,
            source,
            search,
            from,
            to,
            view,
            tz,
          },
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { title, starts_at, ends_at, type = 'meeting', source, linked_task_id = null } = body;

    // Validate required fields
    if (!title || !starts_at) {
      return NextResponse.json(
        { error: 'Missing required fields: title and starts_at are required' },
        { status: 400 }
      );
    }

    const pool = getPgPool(databaseUrl);

    const query = `
      INSERT INTO events (title, starts_at, ends_at, type, source, linked_task_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, starts_at, ends_at, type, source, linked_task_id
    `;

    const result = await pool.query(query, [
      title,
      starts_at,
      ends_at || null,
      type,
      source || null,
      linked_task_id,
    ]);

    return NextResponse.json({
      event: result.rows[0],
      message: 'Event created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'Failed to create event', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const allowedFields = ['title', 'starts_at', 'ends_at', 'type', 'source', 'linked_task_id'];
  const setClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'title' && (typeof updates[field] !== 'string' || updates[field].trim().length === 0)) {
        return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 });
      }
      setClauses.push(`${field} = $${paramIndex}`);
      queryParams.push(field === 'title' ? updates[field].trim() : updates[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const query = `
      UPDATE events
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, title, starts_at, ends_at, type, source, linked_task_id
    `;

    const result = await pool.query(query, [...queryParams, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      event: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
