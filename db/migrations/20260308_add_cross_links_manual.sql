-- Mission Control: Task/Pipeline/Event Cross-Links
-- Run this in Supabase SQL Editor or via psql
-- Migration Date: 2026-03-08

-- Add cross-link columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id);

-- Add comments for documentation
COMMENT ON COLUMN tasks.linked_pipeline_id IS 'Associated pipeline ID (if this task is linked to a pipeline item)';
COMMENT ON COLUMN tasks.linked_event_id IS 'Associated event ID (if this task is linked to a calendar event)';

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
AND column_name IN ('linked_pipeline_id', 'linked_event_id')
ORDER BY column_name;
