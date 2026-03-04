import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, buildPagination, withLegacyListShape } from '../_lib/response';

export async function GET(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const stage = searchParams.get('stage');
  const owner = searchParams.get('owner');
  const search = searchParams.get('search');

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect


    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (stage) {
      whereClauses.push(`stage = $${paramIndex}`);
      queryParams.push(stage);
      paramIndex++;
    }

    if (owner) {
      whereClauses.push(`owner = $${paramIndex}`);
      queryParams.push(owner);
      paramIndex++;
    }

    if (search) {
      const searchId = parseInt(search, 10);
      if (!isNaN(searchId)) {
        whereClauses.push(`(id = $${paramIndex} OR item_name ILIKE $${paramIndex + 1})`);
        queryParams.push(searchId, `%${search}%`);
        paramIndex += 2;
      } else {
        whereClauses.push(`item_name ILIKE $${paramIndex}`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total, MAX(updated_at) as data_updated_at FROM pipelines ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    const now = new Date().toISOString();

    const dataQuery = `
      SELECT id, item_name, stage, owner, due_at, updated_at
      FROM pipelines
      ${whereClause}
      ORDER BY due_at ASC NULLS LAST, id DESC
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
        key: 'pipelines',
        rows: result.rows,
        data: {
          pipelines: result.rows,
          pagination,
          filters: {
            stage,
            owner,
            search,
          },
        },
        meta,
        pagination,
        extra: {
          filters: {
            stage,
            owner,
            search,
          },
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch pipelines:', error);
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}

export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { item_name, stage = 'draft', owner = null, due_at = null } = body;

  if (!item_name || typeof item_name !== 'string' || item_name.trim().length === 0) {
    return NextResponse.json({ error: 'item_name is required' }, { status: 400 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect


    const result = await pool.query(
      `INSERT INTO pipelines (item_name, stage, owner, due_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, item_name, stage, owner, due_at, updated_at`,
      [item_name.trim(), stage, owner, due_at]
    );

    return NextResponse.json({
      success: true,
      pipeline: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to create pipeline:', error);
    return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
  } finally {
    // pool: do not end per-request

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

  const allowedFields = ['item_name', 'stage', 'owner', 'due_at'];
  const setClauses: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      if (field === 'item_name' && (typeof updates[field] !== 'string' || updates[field].trim().length === 0)) {
        return NextResponse.json({ error: 'item_name cannot be empty' }, { status: 400 });
      }
      setClauses.push(`${field} = $${paramIndex}`);
      queryParams.push(field === 'item_name' ? updates[field].trim() : updates[field]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  setClauses.push(`updated_at = NOW()`);

  const pool = getPgPool(databaseUrl);

  try {
    // pool is lazy; no explicit connect


    const query = `
      UPDATE pipelines
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, item_name, stage, owner, due_at, updated_at
    `;

    const result = await pool.query(query, [...queryParams, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pipeline: result.rows[0],
    });
  } catch (error) {
    console.error('Failed to update pipeline:', error);
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
  } finally {
    // pool: do not end per-request

  }
}
