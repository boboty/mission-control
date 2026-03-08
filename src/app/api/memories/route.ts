import { NextRequest, NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

const CATEGORY_OPTIONS = [
  { value: '', label: '全部类别' },
  { value: 'preference', label: '偏好' },
  { value: 'fact', label: '事实' },
  { value: 'decision', label: '决策' },
  { value: 'entity', label: '实体' },
  { value: 'other', label: '其他' },
];

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereClauses.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    if (search) {
      whereClauses.push(`(title ILIKE $${paramIndex++} OR summary ILIKE $${paramIndex++})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM memories
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);
    const totalPages = Math.ceil(total / pageSize);

    // Get data
    const dataQuery = `
      SELECT id, title, category, ref_path, summary, happened_at
      FROM memories
      ${whereClause}
      ORDER BY happened_at DESC NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(pageSize, offset);
    const result = await pool.query(dataQuery, params);

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: result.rows[0]?.happened_at || null,
      dataUpdatedAt: result.rows[0]?.happened_at || null,
    });

    const pagination = {
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    };

    return NextResponse.json(
      withLegacyListShape({
        key: 'memories',
        rows: result.rows,
        data: result.rows,
        meta,
        extra: { pagination, categoryOptions: CATEGORY_OPTIONS },
      })
    );
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  } finally {
    // pool: do not end per-request
  }
}

export async function POST(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const body = await request.json();
    const { title, category, ref_path, summary, happened_at } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await pool.query(
      `
      INSERT INTO memories (title, category, ref_path, summary, happened_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, category, ref_path, summary, happened_at
      `,
      [title, category || null, ref_path || null, summary || null, happened_at || null]
    );

    const memory = result.rows[0];

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error('Failed to create memory:', error);
    return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
  } finally {
    // pool: do not end per-request
  }
}

export async function DELETE(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM memories WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  } finally {
    // pool: do not end per-request
  }
}
