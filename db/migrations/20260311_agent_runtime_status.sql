-- Agent runtime status enhancements
-- Adds richer runtime/presence fields to support busy/idle/offline truth in Mission Control.

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS status_source TEXT DEFAULT 'runtime',
  ADD COLUMN IF NOT EXISTS current_task TEXT,
  ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_idle_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS presence TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Set defaults for existing rows
UPDATE agents SET status_source = 'runtime' WHERE status_source IS NULL;
UPDATE agents SET presence = 'unknown' WHERE presence IS NULL;

-- Drop old unique constraint if exists and recreate with proper handling
DROP INDEX IF EXISTS agents_agent_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_agent_key ON agents(agent_key);

CREATE INDEX IF NOT EXISTS idx_agents_last_seen_at ON agents(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_work_started_at ON agents(work_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_presence ON agents(presence);
CREATE INDEX IF NOT EXISTS idx_agents_state ON agents(state);
