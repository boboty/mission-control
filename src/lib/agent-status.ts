import { getPgPool } from '@/app/api/_lib/pg';

type AgentState = 'running' | 'idle' | 'active';

type AgentStatusOptions = {
  displayName?: string;
  description?: string | null;
};

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
  const normalizedState = state === 'running' ? 'running' : state;

  await pool.query(
    `INSERT INTO agents (agent_key, display_name, description, state, last_seen_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (agent_key) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
       description = COALESCE(EXCLUDED.description, agents.description),
       state = EXCLUDED.state,
       last_seen_at = NOW()`,
    [agentKey, options.displayName || agentKey, options.description || null, normalizedState]
  );
}

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
