-- Mission Control: 完整数据库迁移
-- 执行时间：2026-03-08
-- 执行方式：在 Supabase Dashboard SQL Editor 中运行此脚本

-- ============================================
-- 1. 互链跳转功能 (#80)
-- ============================================

-- tasks 表添加关联字段
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id);

-- pipelines 表添加关联字段
ALTER TABLE pipelines 
  ADD COLUMN IF NOT EXISTS linked_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipelines_linked_task ON pipelines(linked_task_id);

-- events 表添加关联字段
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS linked_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_linked_task ON events(linked_task_id);

-- ============================================
-- 2. 时间线/评论功能 (#93)
-- ============================================

CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  old_value VARCHAR(255),
  new_value VARCHAR(255) NOT NULL,
  actor VARCHAR(100),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  comment TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);

-- ============================================
-- 验证查询
-- ============================================

-- 检查 tasks 表新字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN ('linked_pipeline_id', 'linked_event_id');

-- 检查 task_events 表
SELECT COUNT(*) as event_count FROM task_events;
