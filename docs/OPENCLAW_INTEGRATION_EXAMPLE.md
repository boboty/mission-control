# OpenClaw Runtime Integration Example

This example shows how to integrate OpenClaw runtime with mission-control status reporting.

## Copy to OpenClaw

Copy `src/lib/openclaw-integration.ts` from mission-control to your OpenClaw project:

```bash
# From OpenClaw project root
cp /home/pve/github/mission-control/src/lib/openclaw-integration.ts ./src/lib/
```

## Usage Example

```typescript
// In your OpenClaw agent initialization code
import { AgentStatusReporter } from './lib/openclaw-integration';

// Initialize reporter
const statusReporter = new AgentStatusReporter({
  missionControlUrl: process.env.MISSION_CONTROL_URL || 'http://localhost:3000',
  agentKey: 'main', // or 'feishu_main', 'agent_code', 'baotedu'
});

// Start automatic heartbeat on agent startup
statusReporter.startAutoHeartbeat(5 * 60 * 1000); // Every 5 minutes

// Wrap your task execution
async function executeUserRequest(request: string) {
  const taskId = generateTaskId();
  const taskTitle = truncate(request, 50);
  
  try {
    // Report task start
    await statusReporter.taskStart(taskId, taskTitle);
    
    // Execute the actual task
    const result = await handleRequest(request);
    
    return result;
  } catch (error) {
    console.error('Task failed:', error);
    throw error;
  } finally {
    // Report task end (always runs, even on error)
    await statusReporter.taskEnd(taskId, taskTitle);
  }
}

// Clean shutdown
process.on('SIGINT', () => {
  statusReporter.stopAutoHeartbeat();
  process.exit(0);
});
```

## Minimal Integration (3 lines)

If you want the absolute minimum:

```typescript
import { reportAgentStatus } from './lib/openclaw-integration';

// On task start
await reportAgentStatus('task_start', 'main', { taskTitle: 'User request' });

// On task end
await reportAgentStatus('task_end', 'main');

// Periodic heartbeat (set up a timer in your init code)
setInterval(() => reportAgentStatus('heartbeat', 'main'), 5 * 60 * 1000);
```

## Environment Variables

Add to your OpenClaw `.env`:

```bash
MISSION_CONTROL_URL=https://mission-control.your-domain.com
```

For local testing:

```bash
MISSION_CONTROL_URL=http://localhost:3000
```

## Agent Key Mapping

Use the appropriate agent key based on which agent is running:

| Agent | agentKey |
|-------|----------|
| 鲍特 (main Telegram agent) | `main` |
| 道 Q 鲍特 (Feishu agent) | `feishu_main` |
| 考德鲍特 (coding agent) | `agent_code` |
| 鲍特度 (economy sub-agent) | `baotedu` |
| 沉思鲍特 (thinking agent) | `agent_thinker` |

## Error Handling

Status reporting errors are logged but don't block execution. If mission-control is unavailable, your agent continues working normally.

## Testing

```bash
# Test locally
curl -X POST http://localhost:3000/api/agents/status/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"task_start","agent_key":"main","task_title":"Test"}'

# Check Team Overview page to see status update
```
