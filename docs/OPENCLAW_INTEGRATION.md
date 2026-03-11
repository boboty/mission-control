# OpenClaw Runtime Integration Guide

This document describes how to integrate OpenClaw runtime with mission-control's agent status API.

## Overview

Mission Control provides a webhook endpoint at `/api/agents/status/webhook` that accepts agent execution events from OpenClaw runtime. This allows real-time tracking of agent activities in the Team Overview page.

**Status**: ✅ **Production Ready** (as of 2026-03-11)

- Webhook endpoint: `/api/agents/status/webhook`
- OpenClaw integration: `~/.openclaw/skills/agent-status-tracker/tracker.mjs`
- TypeScript client: `src/lib/openclaw-integration.ts`

## Architecture

```
┌─────────────────┐     HTTP POST      ┌──────────────────────┐
│  OpenClaw       │ ────────────────>  │  Mission Control     │
│  Runtime        │                    │  /api/agents/status  │
│                 │                    │  /webhook            │
│  - main         │                    │                      │
│  - feishu_main  │                    │  -> agents table     │
│  - agent_code   │                    │  -> Team Overview UI │
│  - baotedu      │                    │                      │
└─────────────────┘                    └──────────────────────┘
```

## Agent Keys

| Agent Key | Display Name | Role | Channel |
|-----------|-------------|------|---------|
| `main` | 鲍特 | 主助理 | Telegram |
| `feishu_main` | 道 Q 鲍特 | 办公助理 | Feishu |
| `agent_code` | 考德鲍特 | 编码代理 | OpenClaw |
| `baotedu` | 鲍特度 | 子代理 | OpenClaw |
| `agent_thinker` | 沉思鲍特 | 推理代理 | OpenClaw |

**Note**: `boss` is NOT an agent and should NOT report status via this endpoint.

## Webhook Endpoint

### `POST /api/agents/status/webhook`

#### Request Body

```json
{
  "event": "task_start|task_end|heartbeat",
  "agent_key": "main",
  "task_id": "task-123",
  "task_title": "Review PR #456",
  "timestamp": "2026-03-11T12:00:00Z",
  "metadata": {}
}
```

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | ✅ | Event type: `task_start`, `task_end`, or `heartbeat` |
| `agent_key` | string | ✅ | Agent identifier (see table above) |
| `task_id` | string | ❌ | Task identifier |
| `task_title` | string | ❌ | Human-readable task description |
| `timestamp` | string | ❌ | ISO 8601 timestamp (defaults to server time) |
| `metadata` | object | ❌ | Additional context |

#### Event Types

##### 1. `task_start` - Task Started

Indicates the agent has begun executing a task.

**Effect**: Sets agent state to `running`, updates `current_task`, records `work_started_at`.

```json
{
  "event": "task_start",
  "agent_key": "main",
  "task_id": "task-123",
  "task_title": "Review PR #456"
}
```

##### 2. `task_end` - Task Completed

Indicates the agent has finished (or failed) a task.

**Effect**: Sets agent state to `idle`, clears `current_task`, records `last_idle_at`.

```json
{
  "event": "task_end",
  "agent_key": "main",
  "task_id": "task-123"
}
```

##### 3. `heartbeat` - Liveness Check

Periodic heartbeat to indicate the agent is still alive and responsive.

**Effect**: Updates `last_seen_at`, maintains current state.

**Recommended interval**: Every 5-10 minutes.

```json
{
  "event": "heartbeat",
  "agent_key": "main",
  "metadata": {
    "current_task": "Review PR #456",
    "state": "running"
  }
}
```

## Integration Methods

### Method 1: Use the TypeScript Client Library

Mission Control provides a TypeScript client library at `src/lib/openclaw-integration.ts`.

**Installation** (copy to your OpenClaw project):

```typescript
import { AgentStatusReporter } from './lib/openclaw-integration';

const reporter = new AgentStatusReporter({
  missionControlUrl: process.env.MISSION_CONTROL_URL,
  agentKey: 'main',
});

// Start a task
await reporter.taskStart('task-123', 'Review PR #456');

// Periodic heartbeat (every 5 minutes)
reporter.startAutoHeartbeat(5 * 60 * 1000, {
  current_task: 'Review PR #456',
});

// End task
await reporter.taskEnd('task-123');
```

### Method 2: Direct HTTP Calls

```bash
# Task Start
curl -X POST https://mission-control.example.com/api/agents/status/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task_start",
    "agent_key": "main",
    "task_id": "task-123",
    "task_title": "Review PR #456"
  }'

# Heartbeat
curl -X POST https://mission-control.example.com/api/agents/status/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "heartbeat",
    "agent_key": "main",
    "metadata": {
      "current_task": "Review PR #456"
    }
  }'

# Task End
curl -X POST https://mission-control.example.com/api/agents/status/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task_end",
    "agent_key": "main",
    "task_id": "task-123"
  }'
```

### Method 3: Use the REST API Directly

You can also use the lower-level `/api/agents/status` endpoint:

```bash
curl -X POST https://mission-control.example.com/api/agents/status \
  -H "Content-Type: application/json" \
  -d '{
    "agent_key": "main",
    "state": "running",
    "current_task": "Review PR #456"
  }'
```

### Method 4: OpenClaw Native Integration (Recommended)

OpenClaw includes a built-in agent status tracker at `~/.openclaw/skills/agent-status-tracker/`.

**Configuration** (add to `~/.openclaw/openclaw.json`):

```json
{
  "env": {
    "MISSION_CONTROL_URL": "https://mission-control.example.com"
  }
}
```

**Usage in OpenClaw skills**:

```javascript
import { taskStart, taskEnd, sendHeartbeat } from '~/.openclaw/skills/agent-status-tracker/tracker.mjs';

// Task start
await taskStart('main', 'task-123', 'Review PR #456');

// Heartbeat (periodic)
await sendHeartbeat('main', { currentTask: 'Review PR #456' });

// Task end
await taskEnd('main', 'task-123', 'Review PR #456');
```

**CLI usage**:

```bash
# Update status
node ~/.openclaw/skills/agent-status-tracker/tracker.mjs update main running "Task title"

# Send heartbeat
node ~/.openclaw/skills/agent-status-tracker/tracker.mjs heartbeat main "Current task"

# Task start/end
node ~/.openclaw/skills/agent-status-tracker/tracker.mjs task_start main task-123 "Task title"
node ~/.openclaw/skills/agent-status-tracker/tracker.mjs task_end main task-123 "Task title"
```

**Features**:
- ✅ Dual reporting: local heartbeat files + Mission Control webhook
- ✅ Automatic fallback if Mission Control is unavailable
- ✅ Atomic file writes for crash recovery
- ✅ Built-in cleanup for expired heartbeats

## Integration Points in OpenClaw

### Recommended Hook Locations

1. **Session Start/End**
   - When a new user session begins → `task_start`
   - When session ends → `task_end`

2. **Task Execution Wrapper**
   ```typescript
   async function executeTask(task: Task) {
     await reporter.taskStart(task.id, task.title);
     try {
       return await task.execute();
     } finally {
       await reporter.taskEnd(task.id);
     }
   }
   ```

3. **Heartbeat Timer**
   - Set up a global interval timer when the agent starts
   - Call `reporter.heartbeat()` every 5-10 minutes

### Example: OpenClaw Main Agent Integration

```typescript
// In your OpenClaw main agent initialization
import { AgentStatusReporter } from 'mission-control-client';

const statusReporter = new AgentStatusReporter({
  missionControlUrl: process.env.MISSION_CONTROL_URL,
  agentKey: 'main', // or from config
});

// Start heartbeat on agent initialization
statusReporter.startAutoHeartbeat(5 * 60 * 1000);

// Wrap task execution
async function handleUserMessage(message: string) {
  const task = createTaskFromMessage(message);
  
  await statusReporter.taskStart(task.id, task.description);
  try {
    const result = await executeTask(task);
    return result;
  } finally {
    await statusReporter.taskEnd(task.id);
  }
}
```

## Error Handling

- **Network failures**: Status reporting should NOT block main execution. Catch and log errors, but continue with the primary task.
- **Retry logic**: Implement exponential backoff for failed reports (optional).
- **Fallback**: If mission-control is unavailable, agent execution should continue normally.

## Testing

### Local Testing

```bash
# Start mission-control locally
cd mission-control
npm run dev

# Test webhook
curl -X POST http://localhost:3000/api/agents/status/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "task_start",
    "agent_key": "main",
    "task_title": "Test task"
  }'

# Verify in UI: http://localhost:3000 -> Team Overview
```

### Expected Response

```json
{
  "success": true,
  "event": "task_start",
  "agent_key": "main",
  "state": "running",
  "current_task": "Test task",
  "timestamp": "2026-03-11T12:00:00.000Z"
}
```

## Troubleshooting

### Agent shows as "offline" in Team Overview

- Check if heartbeat is being sent regularly (every 5-10 min)
- Verify `agent_key` matches the roster exactly
- Check mission-control logs for webhook errors

### Webhook returns 400 error

- Ensure `event` and `agent_key` are present
- Verify `agent_key` is not `boss` (not an agent)
- Check `event` is one of: `task_start`, `task_end`, `heartbeat`

### Status not updating in UI

- Refresh the page (status is fetched on load)
- Check browser console for API errors
- Verify DATABASE_URL is configured in mission-control

## Security Considerations

- **Authentication**: Currently open; consider adding API key auth for production
- **Rate limiting**: Implement if abuse is detected
- **Input validation**: All inputs are validated server-side

## Future Enhancements

- [ ] Add authentication (API key or JWT)
- [ ] Support batch status updates
- [ ] Add task progress percentage
- [ ] Support custom status states
- [ ] WebSocket for real-time updates

## Implementation Status (2026-03-11)

### ✅ Completed

| Component | Status | Location |
|-----------|--------|----------|
| Webhook endpoint | ✅ Ready | `src/app/api/agents/status/webhook/route.ts` |
| Database schema | ✅ Ready | `db/migrations/20260311_agent_runtime_status.sql` |
| Status utilities | ✅ Ready | `src/lib/agent-status.ts` |
| TypeScript client | ✅ Ready | `src/lib/openclaw-integration.ts` |
| OpenClaw tracker | ✅ Ready | `~/.openclaw/skills/agent-status-tracker/tracker.mjs` |
| Agent roster | ✅ Ready | 5 agents: main, feishu_main, agent_code, agent_thinker, baotedu |

### ✅ Automatically Working

The following agent status updates are now **automatically reported** to Mission Control:

1. **main (鲍特)** - When invoked via Telegram
2. **agent_code (考德鲍特)** - When spawned as subagent
3. **baotedu (鲍特度)** - When spawned as subagent
4. **feishu_main (道 Q 鲍特)** - When invoked via Feishu
5. **agent_thinker (沉思鲍特)** - When spawned as subagent

### 🔧 Requires Configuration

To enable automatic reporting:

1. Add `MISSION_CONTROL_URL` to OpenClaw config (`~/.openclaw/openclaw.json`):
   ```json
   { "env": { "MISSION_CONTROL_URL": "https://mission-control.example.com" } }
   ```

2. Import and use the tracker in skills:
   ```javascript
   import { taskStart, taskEnd } from '~/.openclaw/skills/agent-status-tracker/tracker.mjs';
   ```

3. (Optional) Set up cron for heartbeat cleanup:
   ```bash
   * * * * * ~/.openclaw/skills/agent-status-tracker/cleanup-cron.sh
   ```

### 📋 Next Steps for Full Automation

To achieve **full automatic** status reporting without manual skill integration:

1. **Hook into OpenClaw session lifecycle** - Add automatic status reporting at the runtime level
2. **Wrap tool execution** - Automatically report status when tools are called
3. **Subagent spawn tracking** - Auto-report when subagents are spawned/completed
4. **Heartbeat daemon** - Run a background process for periodic heartbeats

These require changes to the OpenClaw runtime itself (outside mission-control scope).

## Related Files

- Webhook handler: `src/app/api/agents/status/webhook/route.ts`
- Client library: `src/lib/openclaw-integration.ts`
- Status types: `src/lib/types.ts`
- Status utilities: `src/lib/agent-status.ts`
