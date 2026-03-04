#!/usr/bin/env node
/**
 * Update task status via Mission Control API
 * Usage: node scripts/update_task_status.mjs <taskId> <status> [actor]
 * 
 * Example: node scripts/update_task_status.mjs 82 blocked heartbeat-check
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Parse .env.local
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

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(repoRoot, '.env.local');
const envFromFile = fs.existsSync(envPath) ? parseEnvFile(envPath) : {};

const baseUrl = process.env.MISSION_CONTROL_BASE_URL || envFromFile.MISSION_CONTROL_BASE_URL || 'http://localhost:3000';

const [,, taskIdArg, statusArg, actorArg] = process.argv;

if (!taskIdArg || !statusArg) {
  console.error('Usage: node scripts/update_task_status.mjs <taskId> <status> [actor]');
  console.error('');
  console.error('Arguments:');
  console.error('  taskId   - Task ID to update (required)');
  console.error('  status   - New status: todo, in_progress, blocked, done (required)');
  console.error('  actor    - Actor name (optional, default: "system")');
  console.error('');
  console.error('Example: node scripts/update_task_status.mjs 82 blocked heartbeat-check');
  process.exit(1);
}

const validStatuses = ['todo', 'in_progress', 'blocked', 'done'];
if (!validStatuses.includes(statusArg)) {
  console.error(`ERROR: Invalid status "${statusArg}". Valid values: ${validStatuses.join(', ')}`);
  process.exit(1);
}

const taskId = parseInt(taskIdArg, 10);
if (isNaN(taskId)) {
  console.error(`ERROR: Invalid task ID "${taskIdArg}". Must be a number.`);
  process.exit(1);
}

const actor = actorArg || 'system';

async function updateTaskStatus() {
  const url = `${baseUrl}/api/tasks`;
  
  console.log(`Updating task #${taskId} to status: ${statusArg}`);
  console.log(`API endpoint: ${url}`);
  console.log(`Actor: ${actor}`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status: statusArg,
        actor,
        meta: { updatedBy: 'update_task_status.mjs' }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`ERROR: API returned ${response.status}:`, result);
      process.exit(1);
    }

    console.log('✓ Task updated successfully');
    console.log('');
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('ERROR: Failed to update task:', error.message);
    process.exit(1);
  }
}

updateTaskStatus();
