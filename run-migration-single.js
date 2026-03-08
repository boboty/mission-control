import { Pool } from 'pg';

const DATABASE_URL = 'postgres://postgres:r7gMOQT2hqMWPauK@db.lzhgwgwqldflbozvhuot.supabase.co:6543/postgres';

const pool = new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000
});

async function exec(sql, name) {
  try {
    await pool.query(sql);
    console.log('✅', name);
  } catch (err) {
    if (err.code === '42701' || err.code === '42P07') {
      console.log('⊗', name, '(已存在)');
    } else {
      console.log('❌', name, err.message.substring(0, 60));
    }
  }
}

console.log('🚀 开始执行迁移...\n');

// 互链跳转
await exec('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER', 'tasks.linked_pipeline_id');
await exec('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_event_id INTEGER', 'tasks.linked_event_id');
await exec('CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id)', 'idx_tasks_linked_pipeline');
await exec('CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id)', 'idx_tasks_linked_event');
await exec('ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS linked_task_id INTEGER', 'pipelines.linked_task_id');
await exec('CREATE INDEX IF NOT EXISTS idx_pipelines_linked_task ON pipelines(linked_task_id)', 'idx_pipelines_linked_task');
await exec('ALTER TABLE events ADD COLUMN IF NOT EXISTS linked_task_id INTEGER', 'events.linked_task_id');
await exec('CREATE INDEX IF NOT EXISTS idx_events_linked_task ON events(linked_task_id)', 'idx_events_linked_task');

// 时间线/评论
await exec(`CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  actor VARCHAR(100),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  comment TEXT
)`, 'CREATE TABLE task_events');
await exec('CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id)', 'idx_task_events_task_id');
await exec('CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events(event_type)', 'idx_task_events_event_type');

await pool.end();
console.log('\n✅ 迁移完成');
