import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

function parseEnvFile(p) {
  const out = {};
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientPgError(e) {
  const msg = String(e?.message || e || '');
  const code = e?.code;
  // Common transient network-ish failures seen with Supabase/pgbouncer
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENETUNREACH', 'EAI_AGAIN'].includes(code)) return true;
  return (
    msg.includes('Connection terminated unexpectedly') ||
    msg.includes('Client network socket disconnected') ||
    msg.includes('timeout') ||
    msg.includes('ECONNRESET')
  );
}

async function withRetry(fn, { retries = 3, baseDelayMs = 500, label = 'op' } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastErr = e;
      const transient = isTransientPgError(e);
      if (!transient || attempt === retries) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.error(`WARN: transient DB error during ${label} (attempt ${attempt}/${retries}): ${e?.message || e}`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(repoRoot, '.env.local');
const envFromFile = fs.existsSync(envPath) ? parseEnvFile(envPath) : {};
const databaseUrl = process.env.DATABASE_URL || envFromFile.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not found (set env var or .env.local)');
  process.exit(2);
}

const now = new Date();
const twoHoursMs = 2 * 60 * 60 * 1000;

function msToAge(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m}m`;
}

async function runOnce() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    // Be explicit so transient dial failures fail fast and can retry.
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  });

  try {
    await withRetry(() => client.connect(), { retries: 3, baseDelayMs: 400, label: 'connect' });

    const blockedRes = await withRetry(
      () =>
        client.query(
          `SELECT id, title, status, priority, owner, next_action, updated_at
           FROM tasks
           WHERE blocker = true AND status != 'done'
           ORDER BY updated_at ASC
           LIMIT 100`
        ),
      { retries: 3, baseDelayMs: 400, label: 'query(blocked)' }
    );

    const staleInProgressRes = await withRetry(
      () =>
        client.query(
          `SELECT id, title, status, priority, owner, next_action, updated_at
           FROM tasks
           WHERE status = 'in_progress'
           ORDER BY updated_at ASC
           LIMIT 100`
        ),
      { retries: 3, baseDelayMs: 400, label: 'query(in_progress)' }
    );

    const todoP0P1Res = await withRetry(
      () =>
        client.query(
          `SELECT id, title, status, priority, owner, next_action, depends_on, updated_at
           FROM tasks
           WHERE status = 'todo' AND LOWER(priority) IN ('p0','p1','high')
           ORDER BY LOWER(priority) ASC, updated_at ASC
           LIMIT 100`
        ),
      { retries: 3, baseDelayMs: 400, label: 'query(todo_p0_p1)' }
    );

    const blocked = blockedRes.rows.map((r) => ({ ...r, ageMs: Math.max(0, now - new Date(r.updated_at)) }));
    const staleInProgress = staleInProgressRes.rows
      .map((r) => ({ ...r, ageMs: Math.max(0, now - new Date(r.updated_at)) }))
      .filter((r) => r.ageMs >= twoHoursMs);
    const blockedOver2h = blocked.filter((r) => r.ageMs >= twoHoursMs);

    console.log(`# Heartbeat Snapshot (Supabase)\n`);
    console.log(`- now: ${now.toISOString()}\n`);

    console.log(`## Blocked (blocker=true AND status!=done)\n`);
    if (blocked.length === 0) {
      console.log(`- (empty)\n`);
    } else {
      for (const r of blocked) {
        console.log(
          `- ${r.title} (id=${r.id}) | ${r.priority ?? ''} | owner: ${r.owner ?? ''} | status: ${r.status} | updated: ${msToAge(r.ageMs)} ago`
        );
      }
      console.log('');
    }

    console.log(`## Alerts: Blocked > 2h (by updated_at)\n`);
    if (blockedOver2h.length === 0) {
      console.log(`- (none)\n`);
    } else {
      for (const r of blockedOver2h) {
        console.log(`- ${r.title} (id=${r.id}) | updated: ${msToAge(r.ageMs)} ago | next: ${r.next_action ?? ''}`);
      }
      console.log('');
    }

    console.log(`## Alerts: In Progress stale > 2h (by updated_at)\n`);
    if (staleInProgress.length === 0) {
      console.log(`- (none)\n`);
    } else {
      for (const r of staleInProgress) {
        console.log(`- ${r.title} (id=${r.id}) | updated: ${msToAge(r.ageMs)} ago | next: ${r.next_action ?? ''}`);
      }
      console.log('');
    }

    console.log(`## Todo P0/P1\n`);
    if (todoP0P1Res.rows.length === 0) {
      console.log(`- (none)\n`);
    } else {
      for (const r of todoP0P1Res.rows) {
        const ageMs = Math.max(0, now - new Date(r.updated_at));
        console.log(`- ${r.title} (id=${r.id}) | ${r.priority} | owner: ${r.owner ?? ''} | updated: ${msToAge(ageMs)} ago`);
      }
      console.log('');
    }
  } finally {
    await client.end().catch(() => {});
  }
}

try {
  await runOnce();
} catch (e) {
  const msg = e?.message ?? e;
  const code = e?.code ? ` (code=${e.code})` : '';
  console.error(`ERROR: ${msg}${code}`);
  process.exit(1);
}
