-- Mission Control MVP Database Schema
-- PostgreSQL / Supabase compatible

-- Tasks Board
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  owner VARCHAR(100),
  depends_on INTEGER,
  blocker BOOLEAN DEFAULT FALSE,
  next_action TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  source VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Pipeline
CREATE TABLE IF NOT EXISTS pipelines (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  stage VARCHAR(50) DEFAULT 'draft',
  owner VARCHAR(100),
  due_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  type VARCHAR(50) DEFAULT 'meeting',
  source VARCHAR(50)
);

-- Memory Archive
CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  ref_path VARCHAR(500),
  summary TEXT,
  happened_at TIMESTAMP WITH TIME ZONE
);

-- Team Overview (Agents)
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  agent_key VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  state VARCHAR(50) DEFAULT 'idle',
  last_seen_at TIMESTAMP WITH TIME ZONE
);

-- Ops Health Snapshots
CREATE TABLE IF NOT EXISTS health_snapshots (
  id SERIAL PRIMARY KEY,
  blocked_count INTEGER DEFAULT 0,
  pending_decisions INTEGER DEFAULT 0,
  cron_ok BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Events (for status change history)
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) DEFAULT 'status_change',
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  actor VARCHAR(100),
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_pipelines_stage ON pipelines(stage);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created_at ON task_events(created_at);
