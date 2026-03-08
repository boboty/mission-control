import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, buildPagination, withLegacyListShape } from '../_lib/response';

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const category = searchParams.get('category');
  const search = searchParams.get('search');

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (safePage - 1) * safePageSize;

  const pool = getPgPool(databaseUrl);

  try {
    const whereClauses: string[] = [];
    const queryParams: Array<string | number> = [];
    let paramIndex = 1;

    if (category) {
      whereClauses.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereClauses.push(`(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countQuery = `SELECT COUNT(*) AS total, MAX(happened_at) AS data_updated_at FROM memories ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const result = await pool.query(
      `SELECT id, title, category, ref_path, summary, happened_at
       FROM memories
       ${whereClause}
       ORDER BY happened_at DESC NULLS LAST, id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, safePageSize, offset]
    );

    const pagination = buildPagination({
      page: safePage,
      pageSize: safePageSize,
      total,
    });

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: countResult.rows[0]?.data_updated_at || null,
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'memories',
        rows: result.rows,
        data: {
          memories: result.rows,
          pagination,
          filters: {
            category,
            search,
          },
        },
        meta,
        pagination,
        extra: {
          filters: {
            category,
            search,
          },
        },
      })
    );
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const { title, category = 'other', ref_path = null, summary = null, happened_at = null } = await request.json();

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const pool = getPgPool(databaseUrl);
    const result = await pool.query(
      `INSERT INTO memories (title, category, ref_path, summary, happened_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
       RETURNING id, title, category, ref_path, summary, happened_at`,
      [title.trim(), category, ref_path, summary, happened_at]
    );

    return NextResponse.json({
      success: true,
      memory: result.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const result = await pool.query(
      'DELETE FROM memories WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: Number(id) });
  } catch (error) {
    console.error('Failed to delete memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
