import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT id, title, status, priority, owner, blocker, next_action, due_at, source, updated_at
      FROM tasks
      ORDER BY 
        CASE status WHEN 'done' THEN 3 WHEN 'in_progress' THEN 2 ELSE 1 END,
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        due_at ASC NULLS LAST
      LIMIT 20
    `);
    return NextResponse.json({ tasks: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  } finally {
    await client.end();
  }
}
