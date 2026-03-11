/**
 * OpenClaw Runtime Integration - Agent Status Reporter
 * 
 * This module provides utilities for OpenClaw runtime to report agent execution
 * state to mission-control's status API.
 * 
 * Usage in OpenClaw runtime:
 * ```typescript
 * import { AgentStatusReporter } from './lib/openclaw-integration';
 * 
 * const reporter = new AgentStatusReporter({
 *   missionControlUrl: process.env.MISSION_CONTROL_URL,
 *   agentKey: 'main', // or 'feishu_main', 'agent_code', etc.
 * });
 * 
 * // When starting a task
 * await reporter.taskStart('task-123', 'Review PR #456');
 * 
 * // Periodic heartbeat (call every 5-10 minutes)
 * await reporter.heartbeat({ current_task: 'Review PR #456' });
 * 
 * // When task completes
 * await reporter.taskEnd('task-123');
 * ```
 */

export interface AgentStatusConfig {
  /** Mission Control API base URL (e.g., 'https://mission-control.example.com') */
  missionControlUrl?: string;
  /** Agent identifier (main, feishu_main, agent_code, baotedu, etc.) */
  agentKey: string;
  /** API key for authentication (optional, for future auth) */
  apiKey?: string;
}

export interface HeartbeatMetadata {
  current_task?: string | null;
  state?: 'running' | 'idle' | 'online' | 'offline' | 'blocked';
  [key: string]: any;
}

export class AgentStatusReporter {
  private baseUrl: string;
  private agentKey: string;
  private apiKey?: string;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: AgentStatusConfig) {
    this.baseUrl = (config.missionControlUrl || 'http://localhost:3000').replace(/\/$/, '');
    this.agentKey = config.agentKey;
    this.apiKey = config.apiKey;
  }

  /**
   * Report task start event
   */
  async taskStart(taskId: string, taskTitle?: string): Promise<void> {
    await this.sendWebhook('task_start', {
      task_id: taskId,
      task_title: taskTitle,
    });
  }

  /**
   * Report task end/completion event
   */
  async taskEnd(taskId?: string, taskTitle?: string): Promise<void> {
    await this.sendWebhook('task_end', {
      task_id: taskId,
      task_title: taskTitle,
    });
  }

  /**
   * Send heartbeat to indicate liveness
   * Should be called periodically (every 5-10 minutes)
   */
  async heartbeat(metadata?: HeartbeatMetadata): Promise<void> {
    await this.sendWebhook('heartbeat', metadata);
  }

  /**
   * Start automatic heartbeat at specified interval
   * @param intervalMs - Interval in milliseconds (default: 5 minutes)
   * @param metadata - Optional metadata to include with each heartbeat
   */
  startAutoHeartbeat(intervalMs: number = 5 * 60 * 1000, metadata?: HeartbeatMetadata): void {
    this.stopAutoHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.heartbeat(metadata);
      } catch (error) {
        console.error('[AgentStatusReporter] Heartbeat failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop automatic heartbeat
   */
  stopAutoHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Send webhook to mission-control
   */
  private async sendWebhook(event: string, data: Record<string, any> = {}): Promise<void> {
    const url = `${this.baseUrl}/api/agents/status/webhook`;
    
    const body = {
      event,
      agent_key: this.agentKey,
      timestamp: new Date().toISOString(),
      ...data,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('[AgentStatusReporter] Status reported:', result);
    } catch (error) {
      // Log error but don't throw - status reporting should not block main execution
      console.error('[AgentStatusReporter] Failed to report status:', error);
      throw error; // Re-throw for caller to handle if needed
    }
  }

  /**
   * Get current agent key
   */
  getAgentKey(): string {
    return this.agentKey;
  }
}

/**
 * Convenience function for one-off status reporting
 */
export async function reportAgentStatus(
  event: 'task_start' | 'task_end' | 'heartbeat',
  agentKey: string,
  options?: {
    missionControlUrl?: string;
    taskId?: string;
    taskTitle?: string;
    metadata?: HeartbeatMetadata;
  }
): Promise<void> {
  const reporter = new AgentStatusReporter({
    missionControlUrl: options?.missionControlUrl,
    agentKey,
  });

  switch (event) {
    case 'task_start':
      await reporter.taskStart(options?.taskId || '', options?.taskTitle);
      break;
    case 'task_end':
      await reporter.taskEnd(options?.taskId, options?.taskTitle);
      break;
    case 'heartbeat':
      await reporter.heartbeat(options?.metadata);
      break;
  }
}
