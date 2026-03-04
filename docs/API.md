# Mission Control API Reference

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### Tasks

#### GET /tasks
Fetch task list with pagination and filtering.

**Query Parameters:**
- `page` (default: 1) - Page number
- `pageSize` (default: 20, max: 100) - Items per page
- `status` - Filter by status (todo, in_progress, blocked, done)
- `search` - Search by ID or title
- `sortBy` - Sort order (default, priority, dueDate, status)

**Example:**
```bash
curl "http://localhost:3000/api/tasks?status=in_progress&pageSize=10"
```

#### PATCH /tasks
Update task status.

**Request Body:**
```json
{
  "taskId": 82,
  "status": "blocked",
  "actor": "system",
  "meta": { "reason": "stale > 2h" }
}
```

**Fields:**
- `taskId` (required) - Task ID to update
- `status` (required) - New status (todo, in_progress, blocked, done)
- `actor` (optional, default: "system") - Who made the change
- `meta` (optional) - Additional metadata (JSON object)

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"taskId": 82, "status": "blocked", "actor": "heartbeat-check"}'
```

**Response:**
```json
{
  "success": true,
  "taskId": 82,
  "fromStatus": "in_progress",
  "toStatus": "blocked"
}
```

**Note:** The endpoint is `/api/tasks` (not `/api/tasks/:id`). Task ID is passed in the request body.

---

### Other Endpoints

- `GET /api/agents` - List agents
- `GET /api/agents/status` - Agent status
- `GET /api/events` - Event log
- `GET /api/health` - Health check
- `GET /api/memories` - Memory list
- `GET /api/memory-topics/:slug` - Memory topic detail
- `GET /api/decisions` - Decisions list
- `GET /api/metrics` - Metrics
- `GET /api/pipelines` - Pipeline list

---

## Database

Direct database access is available via Supabase connection string in `DATABASE_URL` env var.

For bulk operations or complex queries, direct DB access may be more efficient than API calls.
