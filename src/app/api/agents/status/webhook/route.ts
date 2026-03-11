import { NextResponse } from 'next/server';
import { updateAgentStatus } from '@/lib/agent-status';

/**
 * POST /api/agents/status/webhook
 * 
 * OpenClaw runtime webhook endpoint for agent status reporting.
 * This is the primary integration point for OpenClaw to report agent execution state.
 * 
 * Supported events:
 * - task_start: Agent starts executing a task
 * - task_end: Agent completes/fails a task
 * - heartbeat: Periodic heartbeat to indicate liveness
 * 
 * Body:
 * - event: string (必需) - 事件类型：task_start|task_end|heartbeat
 * - agent_key: string (必需) - agent 标识 (main, feishu_main, agent_code, baotedu, etc.)
 * - task_id?: string - 任务 ID 或描述
 * - task_title?: string - 任务标题 (可选，用于更友好的显示)
 * - timestamp?: string - ISO 时间戳 (可选，默认服务器时间)
 * - metadata?: object - 额外元数据 (可选)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      event,
      agent_key,
      task_id,
      task_title,
      timestamp,
      metadata,
    } = body;

    // 验证必需字段
    if (!event) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    if (!agent_key) {
      return NextResponse.json({ error: 'Missing agent_key' }, { status: 400 });
    }

    // 排除 boss（boss 不是 agent）
    if (agent_key === 'boss') {
      return NextResponse.json({ 
        error: 'boss is not an agent, use user status endpoint instead',
        success: false,
      }, { status: 400 });
    }

    const now = timestamp || new Date().toISOString();

    switch (event) {
      case 'task_start': {
        // 任务开始：设置为 running 状态，记录当前任务
        const currentTask = task_title || task_id || 'Unknown task';
        await updateAgentStatus(agent_key, 'running', {
          currentTask,
          statusSource: 'openclaw_webhook',
          description: metadata?.description || undefined,
        });

        return NextResponse.json({
          success: true,
          event: 'task_start',
          agent_key,
          state: 'running',
          current_task: currentTask,
          timestamp: now,
        });
      }

      case 'task_end': {
        // 任务结束：设置为 idle 状态
        await updateAgentStatus(agent_key, 'idle', {
          currentTask: null,
          statusSource: 'openclaw_webhook',
        });

        return NextResponse.json({
          success: true,
          event: 'task_end',
          agent_key,
          state: 'idle',
          timestamp: now,
          completed_task: task_id || task_title || null,
        });
      }

      case 'heartbeat': {
        // 心跳：更新 last_seen_at，保持当前状态
        // 通过更新状态为当前状态来刷新 last_seen_at
        const currentState = metadata?.state || 'idle';
        const currentTask = metadata?.current_task || null;
        
        await updateAgentStatus(agent_key, currentState as any, {
          currentTask: currentTask || undefined,
          statusSource: 'openclaw_heartbeat',
        });

        return NextResponse.json({
          success: true,
          event: 'heartbeat',
          agent_key,
          state: currentState,
          current_task: currentTask,
          timestamp: now,
        });
      }

      default:
        return NextResponse.json({ 
          error: `Unknown event type: ${event}. Supported: task_start, task_end, heartbeat`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing agent webhook:', error);
    return NextResponse.json({ 
      error: 'Failed to process webhook',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
