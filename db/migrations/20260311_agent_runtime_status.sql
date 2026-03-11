-- Agent runtime status enhancements
-- Adds richer runtime/presence fields to support busy/idle/offline truth in Mission Control.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS status_source TEXT,
  ADD COLUMN IF NOT EXISTS current_task TEXT,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_idle_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence TEXT;

CREATE INDEX IF NOT EXISTS idx_agents_last_seen_at ON agents(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_work_started_at ON agents(work_started_at DESC);
