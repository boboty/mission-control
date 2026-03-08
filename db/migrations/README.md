# Database Migrations

## Task Events Enhancement (2026-03-08)

This migration enhances the `task_events` table to support complete task timeline tracking including:
- Status changes
- Owner changes
- Priority changes
- Due date changes
- Next action changes
- Comments

### How to Run

#### Option 1: Via Supabase SQL Editor

1. Go to https://lzhgwgwqldflbozvhuot.supabase.co
2. Navigate to SQL Editor
3. Copy and paste the contents of `20260308_task_events_enhancement.sql`
4. Click "Run"

#### Option 2: Via psql (if available)

```bash
psql "postgres://postgres:r7gMOQT2hqMWPauK@db.lzhgwgwqldflbozvhuot.supabase.co:6543/postgres" -f db/migrations/20260308_task_events_enhancement.sql
```

#### Option 3: Via Node.js script

```bash
node scripts/check-db.js
```

### Schema

```sql
CREATE TABLE task_events (
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
```

### Event Types

- `created` - Task was created
- `status_change` - Status was changed (e.g., todo → in_progress)
- `owner_change` - Owner was reassigned
- `priority_change` - Priority was changed
- `due_date_change` - Due date was modified
- `next_action_change` - Next action was updated
- `comment` - A comment was added

### API Usage

#### Get Task Timeline

```bash
GET /api/tasks?taskId=123&timeline=true
```

Response:
```json
{
  "success": true,
  "taskId": 123,
  "events": [
    {
      "id": 1,
      "task_id": 123,
      "event_type": "status_change",
      "old_value": "todo",
      "new_value": "in_progress",
      "actor": "user",
      "comment": null,
      "meta": {},
      "created_at": "2026-03-08T10:00:00Z"
    }
  ]
}
```

#### Update Task with Comment

```bash
PATCH /api/tasks
Content-Type: application/json

{
  "taskId": 123,
  "comment": "This is a comment",
  "actor": "user"
}
```

#### Update Task Fields (auto-records events)

```bash
PATCH /api/tasks
Content-Type: application/json

{
  "taskId": 123,
  "status": "in_progress",
  "priority": "P1",
  "owner": "John",
  "actor": "user",
  "meta": { "reason": "manual_update" }
}
```
