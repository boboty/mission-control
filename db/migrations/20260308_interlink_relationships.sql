-- Mission Control Task #80: Interlink Tasks, Pipelines, and Events
-- Add foreign key relationships between tasks, pipelines, and events
-- Consistent naming: linked_* for fields on the "many" side pointing to "one" side

-- Add relationship fields to tasks table (task can link to one pipeline and one event)
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add relationship field to pipelines table (pipeline can link to one task)
ALTER TABLE pipelines 
  ADD COLUMN IF NOT EXISTS linked_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Add relationship field to events table (event can link to one task)
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS linked_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_linked_task ON pipelines(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_events_linked_task ON events(linked_task_id);

-- Add comments for documentation
COMMENT ON COLUMN tasks.linked_pipeline_id IS 'Linked pipeline project ID';
COMMENT ON COLUMN tasks.linked_event_id IS 'Linked calendar event ID';
COMMENT ON COLUMN pipelines.linked_task_id IS 'Linked task ID';
COMMENT ON COLUMN events.linked_task_id IS 'Linked task ID';
