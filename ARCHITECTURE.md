# Mission Control MVP Architecture

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind
- Data: Supabase Postgres
- ORM: Prisma (or direct SQL migration first)
- Sync: Feishu Bitable -> Supabase (cron job)

## Core Modules
1. Tasks Board (Kanban by status)
2. Process Pipeline (content/flow stages)
3. Calendar (deadline + cron events)
4. Memory Archive (daily logs + SOP notes)
5. Team Overview (agent status)
6. Ops Card (blocked count, pending decision, cron health)

## Data Model (MVP)
- tasks(id, title, status, priority, owner, depends_on, blocker, next_action, due_at, source, updated_at)
- pipelines(id, item_name, stage, owner, due_at, updated_at)
- events(id, title, starts_at, ends_at, type, source)
- memories(id, title, category, ref_path, summary, happened_at)
- agents(id, agent_key, display_name, state, last_seen_at)
- health_snapshots(id, blocked_count, pending_decisions, cron_ok, created_at)

## Integration
- OpenClaw board/cron => write health_snapshots + task updates
- Feishu Bitable => one-way sync into tasks/pipelines/events

## Milestones
- M1: DB schema + seed + frontend skeleton
- M2: Tasks/Pipeline real data
- M3: Feishu sync + health cards
- M4: polish + demo
