-- Seed Data for Mission Control MVP
-- Safe to re-run (uses ON CONFLICT / TRUNCATE)

-- Clear existing data (safe for dev)
TRUNCATE TABLE health_snapshots, agents, memories, events, pipelines, tasks RESTART IDENTITY CASCADE;

-- Tasks
INSERT INTO tasks (title, status, priority, owner, blocker, next_action, due_at, source) VALUES
('Setup Next.js project', 'done', 'high', 'dev', FALSE, 'Complete initial scaffolding', NOW() - INTERVAL '1 day', 'manual'),
('Create dashboard layout', 'in_progress', 'high', 'dev', FALSE, 'Add 6 module cards', NOW(), 'manual'),
('Define database schema', 'done', 'high', 'dev', FALSE, 'Review with team', NOW() - INTERVAL '2 hours', 'manual'),
('Fix login bug', 'todo', 'high', 'alice', TRUE, 'Wait for user report', NOW() + INTERVAL '2 days', 'feishu'),
('Write API docs', 'todo', 'medium', 'bob', FALSE, 'Outline sections', NOW() + INTERVAL '5 days', 'manual'),
('Review PR #42', 'todo', 'low', 'dev', FALSE, 'Schedule time', NOW() + INTERVAL '1 week', 'github');

-- Pipelines
INSERT INTO pipelines (item_name, stage, owner, due_at) VALUES
('Blog: Q1 Review', 'draft', 'alice', NOW() + INTERVAL '3 days'),
('Video: Product Demo', 'recording', 'bob', NOW() + INTERVAL '5 days'),
('Newsletter #24', 'editing', 'dev', NOW() + INTERVAL '1 day'),
('Social: Launch Campaign', 'planning', 'alice', NOW() + INTERVAL '7 days');

-- Events
INSERT INTO events (title, starts_at, ends_at, type, source) VALUES
('Sprint Planning', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 'meeting', 'calendar'),
('Deploy to Production', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1 hour', 'deployment', 'cron'),
('Team Standup', NOW() + INTERVAL '3 hours', NOW() + INTERVAL '3 hours' + INTERVAL '30 minutes', 'meeting', 'calendar'),
('Client Demo', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '1 hour', 'meeting', 'feishu');

-- Memories
INSERT INTO memories (title, category, ref_path, summary, happened_at) VALUES
('Daily Log 2026-02-20', 'daily', 'memory/2026-02-20.md', 'Completed schema design, started dashboard', NOW() - INTERVAL '1 day'),
('SOP: Deployment Process', 'sop', 'docs/sop-deploy.md', 'Step-by-step production deployment guide', NOW() - INTERVAL '3 days'),
('Decision: Tech Stack', 'decision', 'docs/decisions/001-stack.md', 'Chose Next.js + Supabase for MVP', NOW() - INTERVAL '1 week'),
('Lesson: API Rate Limits', 'lesson', 'memory/lessons/api-limits.md', 'Implement retry logic with backoff', NOW() - INTERVAL '2 weeks');

-- Agents
INSERT INTO agents (agent_key, display_name, state, last_seen_at) VALUES
('agent:main:telegram', 'Main Agent', 'active', NOW()),
('agent:code:subagent', 'Code Agent', 'idle', NOW() - INTERVAL '10 minutes'),
('cron:feishu-sync', 'Feishu Sync', 'idle', NOW() - INTERVAL '1 hour'),
('cron:health-check', 'Health Monitor', 'active', NOW());

-- Health Snapshots
INSERT INTO health_snapshots (blocked_count, pending_decisions, cron_ok) VALUES
(1, 2, TRUE),
(0, 1, TRUE),
(2, 0, FALSE);
