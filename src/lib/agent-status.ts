/**
 * Agent Status Tracker - Client Helper
 * 在 sessions_spawn 时自动更新 agent 状态
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const HEARTBEAT_DIR = path.join(process.env.HOME || '/root', '.openclaw', 'run');

/**
 * 确保心跳目录存在
 */
function ensureHeartbeatDir() {
  if (!fs.existsSync(HEARTBEAT_DIR)) {
    fs.mkdirSync(HEARTBEAT_DIR, { recursive: true, mode: 0o755 });
  }
}

/**
 * 更新 agent 状态（写入心跳文件）
 */
export async function updateAgentStatus(agentKey: string, state: 'running' | 'idle' | 'active') {
  try {
    ensureHeartbeatDir();
    
    const heartbeatFile = path.join(HEARTBEAT_DIR, `agent-${agentKey}.heartbeat`);
    const data = {
      agent_key: agentKey,
      state: state,
      last_seen_at: new Date().toISOString(),
      updated_at: Date.now(),
    };
    
    // 原子写入
    const tempFile = heartbeatFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), { mode: 0o644 });
    fs.renameSync(tempFile, heartbeatFile);
    
    console.log(`[AgentStatus] ${agentKey} → ${state}`);
  } catch (e) {
    console.error('[AgentStatus] Failed to update status:', e);
  }
}

/**
 * 包装 sessions_spawn，自动更新状态
 * 在 spawn 前调用此函数
 */
export async function withAgentStatus<T>(
  agentKey: string,
  fn: () => Promise<T>
): Promise<T> {
  // 开始工作
  await updateAgentStatus(agentKey, 'running');
  
  try {
    const result = await fn();
    return result;
  } catch (e) {
    throw e;
  } finally {
    // 完成后设置为 idle（可选，超时会自动 idle）
    // await updateAgentStatus(agentKey, 'idle');
  }
}
