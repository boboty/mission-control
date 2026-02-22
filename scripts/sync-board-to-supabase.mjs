import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const root = '/home/pve/.openclaw/workspace';
const boardPath = path.join(root, 'process', 'board.md');
const envPath = path.join(root, 'mission-control', '.env.local');

if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of env) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL missing');

const md = fs.readFileSync(boardPath, 'utf8');
const lines = md.split('\n');

const sectionMap = {
  Inbox: 'inbox',
  Todo: 'todo',
  Process: 'in_progress',
  Checklist: 'checklist',
  Done: 'done',
  Blocked: 'blocked',
};

let section = null;
const tasks = [];

function mapPriority(p) {
  if (p === 'P0' || p === 'P1') return 'high';
  if (p === 'P2') return 'medium';
  return 'low';
}

for (const line of lines) {
  const sec = line.match(/^##\s+(Inbox|Todo|Process|Checklist|Done|Blocked)\s*$/);
  if (sec) {
    section = sec[1];
    continue;
  }

  const item = line.match(/^- \[( |x)\] (.+)$/);
  if (!item || !section) continue;
  const raw = item[2].trim();
  if (raw.includes('（空）')) continue;

  const parts = raw.split('|').map((x) => x.trim());
  const title = parts[0];
  const pRaw = parts.find((x) => /^P\d$/.test(x)) || 'P2';
  const owner = (parts.find((x) => x.startsWith('owner:')) || '').replace('owner:', '').trim() || null;
  const next = (parts.find((x) => x.startsWith('next:')) || '').replace('next:', '').trim() || null;

  const status = sectionMap[section] || 'todo';
  const blocker = status === 'blocked';

  tasks.push({
    title,
    status,
    priority: mapPriority(pRaw),
    owner,
    blocker,
    next_action: next,
    source: 'board',
  });
}

const owners = [...new Set(tasks.map((t) => t.owner).filter(Boolean))];

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query('BEGIN');

  await client.query('TRUNCATE TABLE tasks, pipelines, events, memories, agents, health_snapshots RESTART IDENTITY');

  for (const t of tasks) {
    await client.query(
      `INSERT INTO tasks (title, status, priority, owner, blocker, next_action, source, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
      [t.title, t.status, t.priority, t.owner, t.blocker, t.next_action, t.source],
    );
  }

  for (const key of owners) {
    await client.query(
      `INSERT INTO agents (agent_key, display_name, state, last_seen_at)
       VALUES ($1,$2,'active',NOW())`,
      [key, key],
    );
  }

  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  await client.query(
    `INSERT INTO health_snapshots (blocked_count, pending_decisions, cron_ok, created_at)
     VALUES ($1, 0, true, NOW())`,
    [blockedCount],
  );

  await client.query('COMMIT');
  console.log(`Synced ${tasks.length} tasks from board.md to Supabase`);
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  await client.end();
}
