#!/usr/bin/env node
/**
 * Sync Mission Control tasks to Feishu Bitable
 * 
 * Usage: node scripts/sync-to-feishu.mjs
 * 
 * Environment variables (required):
 * - FEISHU_APP_ID: Feishu App ID
 * - FEISHU_APP_SECRET: Feishu App Secret
 * - FEISHU_BITABLE_APP_TOKEN: Bitable App Token
 * - FEISHU_BITABLE_TABLE_ID: Bitable Table ID
 * 
 * Field mapping:
 * - 任务 ID → 编号 (Text)
 * - 标题 → 任务名称 (Text)
 * - 状态 → 状态 (SingleSelect)
 * - 优先级 → 优先级 (SingleSelect)
 * - 负责人 → 负责人 (Text)
 * - 截止日期 → 截止日期 (DateTime)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

// Parse .env.local
function parseEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  const txt = fs.readFileSync(p, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    let k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const envFromFile = parseEnvFile(path.join(repoRoot, '.env.local'));

// Get config from env
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || envFromFile.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || envFromFile.FEISHU_APP_SECRET;
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || envFromFile.FEISHU_BITABLE_APP_TOKEN;
const FEISHU_BITABLE_TABLE_ID = process.env.FEISHU_BITABLE_TABLE_ID || envFromFile.FEISHU_BITABLE_TABLE_ID;

// Validate config
if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
  console.error('ERROR: FEISHU_APP_ID and FEISHU_APP_SECRET are required');
  process.exit(1);
}
if (!FEISHU_BITABLE_APP_TOKEN || !FEISHU_BITABLE_TABLE_ID) {
  console.error('ERROR: FEISHU_BITABLE_APP_TOKEN and FEISHU_BITABLE_TABLE_ID are required');
  process.exit(1);
}

// Feishu API base URL
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

/**
 * Get Feishu tenant access token
 */
async function getAccessToken() {
  const url = `${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });
  
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(`Failed to get access token: ${result.msg || result.message}`);
  }
  return result.tenant_access_token;
}

/**
 * List records from Bitable table
 */
async function listRecords(accessToken, pageSize = 500) {
  const url = `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_BITABLE_TABLE_ID}/records?page_size=${pageSize}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(`Failed to list records: ${result.msg || result.message}`);
  }
  return result.data || { items: [], page_token: null, has_more: false };
}

/**
 * Create a record in Bitable table
 */
async function createRecord(accessToken, fields) {
  const url = `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_BITABLE_TABLE_ID}/records`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(`Failed to create record: ${result.msg || result.message}`);
  }
  return result.data;
}

/**
 * Update a record in Bitable table
 */
async function updateRecord(accessToken, recordId, fields) {
  const url = `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_BITABLE_APP_TOKEN}/tables/${FEISHU_BITABLE_TABLE_ID}/records/${recordId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  
  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(`Failed to update record: ${result.msg || result.message}`);
  }
  return result.data;
}

/**
 * Parse board.md and extract tasks
 */
function parseBoardMd(boardPath) {
  const md = fs.readFileSync(boardPath, 'utf8');
  const lines = md.split('\n');
  const tasks = [];
  
  let currentTask = null;
  let inCurrentTask = false;
  
  for (const line of lines) {
    // Match task header: ### T-20260308-078 - 记忆归档 API + UI  or  ## 任务 #77 - Calendar API + List 视图
    const taskHeader = line.match(/^#+\s+(T-\d+-\d+|任务\s*#\d+)\s*-\s*(.+?)\s*$/);
    if (taskHeader) {
      // Save previous task
      if (currentTask) {
        tasks.push(currentTask);
      }
      
      const taskId = taskHeader[1].replace(/\s/g, '');
      const title = taskHeader[2].trim();
      
      currentTask = {
        id: taskId,
        title: title,
        status: 'todo',
        priority: 'P2',
        owner: null,
        dueDate: null,
      };
      inCurrentTask = true;
      continue;
    }
    
    if (!inCurrentTask || !currentTask) continue;
    
    // Parse status: **状态**: ✅ 已完成  or  **状态**: 🔄 进行中
    const statusMatch = line.match(/\*\*状态\*\*:\s*(.+?)\s*$/);
    if (statusMatch) {
      const statusRaw = statusMatch[1].trim();
      if (statusRaw.includes('✅') || statusRaw.includes('已完成')) {
        currentTask.status = 'done';
      } else if (statusRaw.includes('🔄') || statusRaw.includes('进行中')) {
        currentTask.status = 'in_progress';
      } else if (statusRaw.includes('🚫') || statusRaw.includes('阻塞')) {
        currentTask.status = 'blocked';
      } else if (statusRaw.includes('⏳') || statusRaw.includes('待处理')) {
        currentTask.status = 'todo';
      }
    }
    
    // Parse priority: **优先级**: P1
    const priorityMatch = line.match(/\*\*优先级\*\*:\s*(P[0-2])\s*$/);
    if (priorityMatch) {
      currentTask.priority = priorityMatch[1];
    }
    
    // Parse owner: **负责人**: xxx
    const ownerMatch = line.match(/\*\*负责人\*\*:\s*(.+?)\s*$/);
    if (ownerMatch) {
      currentTask.owner = ownerMatch[1].trim();
    }
    
    // Parse due date: **截止日期**: 2026-03-15
    const dueDateMatch = line.match(/\*\*截止日期\*\*:\s*(\d{4}-\d{2}-\d{2})\s*$/);
    if (dueDateMatch) {
      currentTask.dueDate = dueDateMatch[1];
    }
  }
  
  // Don't forget the last task
  if (currentTask) {
    tasks.push(currentTask);
  }
  
  return tasks;
}

/**
 * Map status to Feishu SingleSelect value
 */
function mapStatus(status) {
  const statusMap = {
    'todo': '待处理',
    'in_progress': '进行中',
    'blocked': '阻塞',
    'done': '已完成',
  };
  return statusMap[status] || '待处理';
}

/**
 * Map priority to Feishu SingleSelect value
 */
function mapPriority(priority) {
  const priorityMap = {
    'P0': 'P0 - 紧急',
    'P1': 'P1 - 高',
    'P2': 'P2 - 中',
  };
  return priorityMap[priority] || 'P2 - 中';
}

/**
 * Convert date to Feishu DateTime format (timestamp in ms)
 */
function mapDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.getTime();
}

/**
 * Main sync function
 */
async function sync() {
  console.log('🚀 Starting Feishu Bitable sync...\n');
  
  // Parse board.md
  const boardPath = path.join(repoRoot, 'board.md');
  if (!fs.existsSync(boardPath)) {
    console.error(`ERROR: board.md not found at ${boardPath}`);
    process.exit(1);
  }
  
  console.log(`📄 Parsing ${boardPath}...`);
  const tasks = parseBoardMd(boardPath);
  console.log(`   Found ${tasks.length} tasks\n`);
  
  // Get access token
  console.log('🔑 Getting Feishu access token...');
  const accessToken = await getAccessToken();
  console.log('   ✓ Token obtained\n');
  
  // Get existing records from Bitable
  console.log('📋 Fetching existing records from Bitable...');
  const existingData = await listRecords(accessToken);
  const existingRecords = existingData.items || [];
  console.log(`   Found ${existingRecords.length} existing records\n`);
  
  // Build a map of existing records by task ID
  const existingMap = new Map();
  for (const record of existingRecords) {
    const fields = record.fields || {};
    // Assuming the first field is the task ID field (编号)
    const taskIdField = Object.keys(fields)[0];
    if (taskIdField && fields[taskIdField]) {
      existingMap.set(fields[taskIdField], record);
    }
  }
  
  // Sync tasks
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  
  console.log('🔄 Syncing tasks...\n');
  
  for (const task of tasks) {
    const fields = {
      '编号': task.id,
      '任务名称': task.title,
      '状态': mapStatus(task.status),
      '优先级': mapPriority(task.priority),
      '负责人': task.owner || '',
      '截止日期': mapDate(task.dueDate),
    };
    
    const existingRecord = existingMap.get(task.id);
    
    if (existingRecord) {
      // Check if update is needed
      const existingFields = existingRecord.fields || {};
      let needsUpdate = false;
      
      // Simple comparison - check if any field differs
      for (const key of Object.keys(fields)) {
        const existingValue = existingFields[key];
        const newValue = fields[key];
        
        // Handle DateTime comparison (might be stored differently)
        if (key === '截止日期') {
          if (newValue && !existingValue) needsUpdate = true;
          continue;
        }
        
        if (existingValue !== newValue) {
          needsUpdate = true;
          break;
        }
      }
      
      if (needsUpdate) {
        console.log(`   ✏️  Updating: ${task.id} - ${task.title.substring(0, 40)}...`);
        await updateRecord(accessToken, existingRecord.record_id, fields);
        updated++;
      } else {
        console.log(`   ⏭️  Unchanged: ${task.id}`);
        unchanged++;
      }
    } else {
      console.log(`   ➕ Creating: ${task.id} - ${task.title.substring(0, 40)}...`);
      await createRecord(accessToken, fields);
      created++;
    }
  }
  
  // Summary
  console.log('\n✅ Sync completed!\n');
  console.log('📊 Summary:');
  console.log(`   - Created: ${created}`);
  console.log(`   - Updated: ${updated}`);
  console.log(`   - Unchanged: ${unchanged}`);
  console.log(`   - Total: ${tasks.length}\n`);
  
  // Update task status to done if all synced successfully
  if (created + updated + unchanged === tasks.length) {
    console.log('🎯 All tasks synced successfully');
  }
}

// Run
sync().catch((error) => {
  console.error('❌ Sync failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
