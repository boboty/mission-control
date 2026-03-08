import { Pool } from 'pg';

const DATABASE_URL = 'postgres://postgres:r7gMOQT2hqMWPauK@db.lzhgwgwqldflbozvhuot.supabase.co:6543/postgres';

async function execWithRetry(sql, name, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const pool = new Pool({ 
      connectionString: DATABASE_URL, 
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000
    });
    try {
      await pool.query(sql);
      console.log('✅', name);
      await pool.end();
      return true;
    } catch (err) {
      await pool.end();
      if (i < maxRetries - 1) {
        console.log(`⏳ ${name} 重试 ${i + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, 1000));
      } else {
        if (err.code === '42701' || err.code === '42P07') {
          console.log('⊗', name, '(已存在)');
        } else {
          console.log('❌', name, err.message.substring(0, 50));
        }
      }
    }
  }
  return false;
}

console.log('🚀 开始执行迁移...\n');

await execWithRetry('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER', 'tasks.linked_pipeline_id');
await execWithRetry('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_event_id INTEGER', 'tasks.linked_event_id');
await execWithRetry('CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id)', 'idx: tasks.linked_pipeline_id');
await execWithRetry('CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id)', 'idx: tasks.linked_event_id');
await execWithRetry('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS linked_task_id INTEGER', 'pipelines.linked_task_id');
await execWithRetry('CREATE INDEX IF NOT EXISTS idx_pipelines_linked_task ON pipelines(linked_task_id)', 'idx: pipelines.linked_task_id');
await execWithRetry('ALTER TABLE events ADD COLUMN IF NOT EXISTS linked_task_id INTEGER', 'events.linked_task_id');
await execWithRetry('CREATE INDEX IF NOT EXISTS idx_events_linked_task ON events(linked_task_id)', 'idx: events.linked_task_id');
await execWithRetry(`CREATE TABLE IF NOT EXISTS task_events (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL, event_type VARCHAR(50) DEFAULT 'status_change', old_value VARCHAR(255), new_value VARCHAR(255), actor VARCHAR(100), meta JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW(), comment TEXT)`, 'TABLE: task_events');
await execWithRetry('CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id)', 'idx: task_events.task_id');

console.log('\n✅ 迁移执行完成');
