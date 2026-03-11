import { getPgPool } from '@/app/api/_lib/pg';

type AgentState = 'running' | 'idle' | 'active' | 'online' | 'offline' | 'blocked';

type AgentStatusOptions = {
  displayName?: string;
  description?: string | null;
  currentTask?: string | null;
  statusSource?: string;
};

/**
 * 更新单个 agent 的状态
 */
export async function updateAgentStatus(
  agentKey: string,
  state: AgentState,
  options: AgentStatusOptions = {}
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const pool = getPgPool(databaseUrl);
  const presence = state === 'offline' ? 'offline' : 'online';

  // Compute timestamps in JS to avoid SQL type inference issues
  const workStartedAt = state === 'running' ? new Date() : null;
  const lastIdleAt = (state === 'idle' || state === 'offline') ? new Date() : null;

  await pool.query(
    `INSERT INTO agents (agent_key, display_name, description, state, presence, current_task, status_source, last_seen_at, work_started_at, last_idle_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
     ON CONFLICT (agent_key) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
       description = COALESCE(EXCLUDED.description, agents.description),
       state = EXCLUDED.state,
       presence = EXCLUDED.presence,
       current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
       status_source = COALESCE(EXCLUDED.status_source, agents.status_source, 'runtime'),
       last_seen_at = NOW(),
       work_started_at = CASE WHEN EXCLUDED.state = 'running' THEN NOW() ELSE agents.work_started_at END,
       last_idle_at = CASE WHEN EXCLUDED.state IN ('idle', 'offline') THEN NOW() ELSE agents.last_idle_at END`,
    [
      agentKey,
      options.displayName || agentKey,
      options.description || null,
      state,
      presence,
      options.currentTask || null,
      options.statusSource || 'runtime',
      workStartedAt,
      lastIdleAt,
    ]
  );
}

/**
 * 包装函数：在执行前后自动更新 agent 状态
 * 适用于需要跟踪运行时的函数
 */
export async function withAgentStatus<T>(
  agentKey: string,
  fn: () => Promise<T>,
  options: AgentStatusOptions = {}
): Promise<T> {
  await updateAgentStatus(agentKey, 'running', options);

  try {
    return await fn();
  } finally {
    await updateAgentStatus(agentKey, 'idle', options);
  }
}

/**
 * 批量更新多个 agent 状态
 */
export async function updateAgentStatuses(
  statuses: Array<{
    agentKey: string;
    state: AgentState;
    displayName?: string;
    description?: string | null;
    currentTask?: string | null;
  }>
) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const pool = getPgPool(databaseUrl);
  const results = [];

  for (const { agentKey, state, displayName, description, currentTask } of statuses) {
    const presence = state === 'offline' ? 'offline' : 'online';
    const workStartedAt = state === 'running' ? new Date() : null;
    const lastIdleAt = (state === 'idle' || state === 'offline') ? new Date() : null;

    try {
      await pool.query(
        `INSERT INTO agents (agent_key, display_name, description, state, presence, current_task, status_source, last_seen_at, work_started_at, last_idle_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'runtime', NOW(), $7, $8)
         ON CONFLICT (agent_key) DO UPDATE SET
           display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
           description = COALESCE(EXCLUDED.description, agents.description),
           state = EXCLUDED.state,
           presence = EXCLUDED.presence,
           current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
           last_seen_at = NOW(),
           work_started_at = CASE WHEN EXCLUDED.state = 'running' THEN NOW() ELSE agents.work_started_at END,
           last_idle_at = CASE WHEN EXCLUDED.state IN ('idle', 'offline') THEN NOW() ELSE agents.last_idle_at END`,
        [
          agentKey,
          displayName || agentKey,
          description || null,
          state,
          presence,
          currentTask || null,
          workStartedAt,
          lastIdleAt,
        ]
      );
      results.push({ agentKey, state, success: true });
    } catch (error) {
      console.error(`Failed to update status for ${agentKey}:`, error);
      results.push({ agentKey, state, success: false, error });
    }
  }

  return results;
}

/**
 * 标记 agent 为离线（心跳超时场景）
 */
export async function markAgentOffline(agentKey: string) {
  return updateAgentStatus(agentKey, 'offline', {
    statusSource: 'heartbeat_timeout',
  });
}

/**
 * 获取 agent 当前状态（用于内部查询）
 */
export async function getAgentStatus(agentKey: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured');
  }

  const pool = getPgPool(databaseUrl);
  const result = await pool.query(
    `SELECT agent_key, state, presence, last_seen_at, current_task, status_source
     FROM agents
     WHERE agent_key = $1`,
    [agentKey]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
