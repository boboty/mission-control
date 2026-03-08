const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzhgwgwqldflbozvhuot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aGd3Z3dxbGRmbGJvenZodW90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY1NDQ4NCwiZXhwIjoyMDg3MjMwNDg0fQ.dGZ3v8qPPzR3K3JqKqQ3K3JqKqQ3K3JqKqQ3K3JqKqQ';

// 使用 service role key 如果有，否则使用 anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  console.log('Running task_events migration...');
  
  try {
    // 使用 Supabase RPC 或 SQL 执行迁移
    // 由于 Supabase 客户端不直接支持 DDL，我们需要检查表是否已存在
    
    // 检查 task_events 表
    const { data: tables, error } = await supabase
      .from('task_events')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('Table task_events does not exist. Please create it via Supabase dashboard or SQL editor.');
        console.log('\nSQL to run in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  old_value VARCHAR(255),
  new_value VARCHAR(255) NOT NULL,
  actor VARCHAR(100),
  comment TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events(event_type);
        `);
        return;
      }
      throw error;
    }
    
    console.log('✓ task_events table exists');
    
    // 检查是否有示例数据
    const { count } = await supabase
      .from('task_events')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✓ task_events has ${count || 0} records`);
    
    console.log('\nMigration check completed successfully!');
    
  } catch (error) {
    console.error('Migration check failed:', error.message);
    process.exit(1);
  }
}

runMigration();
