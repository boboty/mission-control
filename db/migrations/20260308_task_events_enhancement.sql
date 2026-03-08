-- Mission Control: 任务事件表增强
-- 创建时间：2026-03-08
-- 说明：支持完整的任务时间线（状态变更、负责人变更、优先级变更、评论等）

-- ============================================
-- 1. 增强 task_events 表结构
-- ============================================

-- 如果表不存在则创建（向后兼容）
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  old_value VARCHAR(255),
  new_value VARCHAR(255) NOT NULL,
  actor VARCHAR(100),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 添加评论字段（用于存储评论内容）
ALTER TABLE task_events ADD COLUMN IF NOT EXISTS comment TEXT;

-- 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON task_events(event_type);

-- ============================================
-- 2. 迁移旧数据（如果有 from_status/to_status 字段）
-- ============================================
-- 注意：这个迁移只在旧表有 from_status/to_status 字段时执行
DO $$
BEGIN
  -- 检查是否存在 from_status 字段
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_events' AND column_name = 'from_status'
  ) THEN
    -- 迁移数据：将 from_status 转为 old_value, to_status 转为 new_value
    UPDATE task_events 
    SET old_value = from_status, new_value = to_status
    WHERE old_value IS NULL AND from_status IS NOT NULL;
    
    -- 更新 event_type
    UPDATE task_events 
    SET event_type = 'status_change'
    WHERE event_type IS NULL OR event_type = '';
  END IF;
END $$;

-- ============================================
-- 3. 插入示例事件数据（用于测试）
-- ============================================
-- 仅为测试目的，实际使用时可删除
INSERT INTO task_events (task_id, event_type, old_value, new_value, actor, comment, meta, created_at)
SELECT 
  t.id,
  'created',
  NULL,
  '任务创建',
  t.owner,
  '任务初始化',
  '{"auto": true}'::jsonb,
  t.updated_at - INTERVAL '1 day'
FROM tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM task_events te WHERE te.task_id = t.id AND te.event_type = 'created'
)
LIMIT 10;

COMMENT ON TABLE task_events IS '任务事件表 - 记录任务的所有变更历史和评论';
COMMENT ON COLUMN task_events.event_type IS '事件类型：created, status_change, owner_change, priority_change, comment, due_date_change, next_action_change';
COMMENT ON COLUMN task_events.old_value IS '变更前的值';
COMMENT ON COLUMN task_events.new_value IS '变更后的值';
COMMENT ON COLUMN task_events.actor IS '操作者';
COMMENT ON COLUMN task_events.comment IS '评论内容（仅 comment 类型事件使用）';
COMMENT ON COLUMN task_events.meta IS '额外元数据（JSON 格式）';
