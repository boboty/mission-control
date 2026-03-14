import { NextResponse } from 'next/server';
import { getPgPool } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';

type Presence = 'online' | 'offline' | 'unknown';
type WorkState = 'working' | 'idle' | 'blocked' | 'stale' | 'offline';

type RuntimeAgentRow = {
  id: number;
  agent_key: string;
  display_name: string | null;
  description: string | null;
  state: string | null;
  last_seen_at: string | null;
  current_task: string | null;
  status_source: string | null;
  work_started_at: string | null;
  last_idle_at: string | null;
  presence: string | null;
};

type TaskSummaryRow = {
  agent_key: string;
  open_task_count: string | number;
  active_task_count: string | number;
  blocked_task_count: string | number;
  latest_task_activity_at: string | null;
};

type TaskHeadlineRow = {
  agent_key: string;
  task_id: number;
  title: string;
  status: string | null;
  blocker: boolean | null;
  updated_at: string | null;
};

type TaskEventRow = {
  agent_key: string;
  latest_event_at: string | null;
  event_type: string | null;
  task_title: string | null;
};

const AGENT_STATUS_TIMEOUT_MINUTES = Number(process.env.AGENT_STATUS_TIMEOUT_MINUTES || '10');
const DERIVED_ACTIVITY_WINDOW_MINUTES = Number(process.env.AGENT_DERIVED_ACTIVITY_WINDOW_MINUTES || '20');
const FRESHNESS_FRESH_HOURS = 1;
const FRESHNESS_RECENT_HOURS = 24;

const AGENT_OVERRIDES: Record<string, { displayName?: string; description?: string; role?: string; channel?: string }> = {
  main: {
    displayName: '鲍特',
    description: '主助理，负责 Telegram 主会话与团队协调',
    role: '主助理',
    channel: 'Telegram',
  },
  feishu_main: {
    displayName: '道 Q 鲍特',
    description: '飞书办公助理，对外名为道 Q 鲍特，负责文档与办公流程',
    role: '办公助理',
    channel: 'Feishu',
  },
  agent_code: {
    displayName: '考德鲍特',
    description: '编码代理，负责研发与代码处理',
    role: '编码代理',
    channel: 'OpenClaw',
  },
  baotedu: {
    displayName: '鲍特度',
    description: '经济型子代理，承接低成本子任务',
    role: '子代理',
    channel: 'OpenClaw',
  },
  agent_thinker: {
    displayName: '沉思鲍特',
    description: '深度推理代理，负责架构与决策思考',
    role: '推理代理',
    channel: 'OpenClaw',
  },
};

const KNOWN_TEAM_ROSTER = Object.entries(AGENT_OVERRIDES)
  .filter(([key]) => key !== 'boss')
  .map(([agent_key, value], index) => ({
    id: -(index + 1),
    agent_key,
    display_name: value.displayName || agent_key,
    description: value.description || null,
    state: 'offline' as const,
    last_seen_at: null as string | null,
    current_task: null as string | null,
    status_source: 'roster' as const,
    work_started_at: null as string | null,
    last_idle_at: null as string | null,
    presence: 'unknown' as const,
    work_state: 'offline' as WorkState,
    freshness_level: 'unknown' as const,
    freshness_label: '未知',
  }));

function normalizeAgentState(state: string | null | undefined): string {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  if (state === 'active' || state === 'online') return 'online';
  return state;
}

function normalizeTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getAgeMs(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return Number.POSITIVE_INFINITY;
  return Date.now() - time;
}

function getLatestTimestamp(...values: Array<string | null | undefined>): string | null {
  let latest: string | null = null;
  let latestTime = 0;

  for (const value of values) {
    const normalized = normalizeTimestamp(value);
    if (!normalized) continue;
    const time = new Date(normalized).getTime();
    if (time > latestTime) {
      latest = normalized;
      latestTime = time;
    }
  }

  return latest;
}

function derivePresence(lastSeenAt: string | null | undefined, storedPresence: string | null | undefined): Presence {
  if (!lastSeenAt) {
    return storedPresence === 'offline' ? 'offline' : 'unknown';
  }

  const timeoutMs = AGENT_STATUS_TIMEOUT_MINUTES * 60 * 1000;
  return getAgeMs(lastSeenAt) > timeoutMs ? 'offline' : 'online';
}

function getFreshnessLevel(lastSeenAt: string | null | undefined): 'fresh' | 'recent' | 'stale' | 'unknown' {
  if (!lastSeenAt) return 'unknown';

  const hours = getAgeMs(lastSeenAt) / (1000 * 60 * 60);
  if (hours <= FRESHNESS_FRESH_HOURS) return 'fresh';
  if (hours <= FRESHNESS_RECENT_HOURS) return 'recent';
  return 'stale';
}

function getFreshnessLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return '未知';

  const hours = getAgeMs(lastSeenAt) / (1000 * 60 * 60);
  if (hours < 1) return '1 小时内';
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function toCount(value: string | number | null | undefined) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveWorkState(params: {
  runtimeState: string;
  hasRuntimeState: boolean;
  presence: Presence;
  latestObservedAt: string | null;
  latestTaskActivityAt: string | null;
  latestActorEventAt: string | null;
  openTaskCount: number;
  activeTaskCount: number;
  blockedTaskCount: number;
}): WorkState {
  const {
    runtimeState,
    hasRuntimeState,
    presence,
    latestObservedAt,
    latestTaskActivityAt,
    latestActorEventAt,
    openTaskCount,
    activeTaskCount,
    blockedTaskCount,
  } = params;

  const activityWindowMs = DERIVED_ACTIVITY_WINDOW_MINUTES * 60 * 1000;
  const recentTaskActivity = getAgeMs(latestTaskActivityAt) <= activityWindowMs;
  const recentActorActivity = getAgeMs(latestActorEventAt) <= activityWindowMs;
  const hasRecentDerivedActivity = recentTaskActivity || recentActorActivity;
  const hasRecentSignal = presence === 'online' || hasRecentDerivedActivity;
  const hasTimedSignal = Number.isFinite(getAgeMs(latestObservedAt));

  if (!hasRuntimeState && !latestObservedAt && openTaskCount === 0 && activeTaskCount === 0 && blockedTaskCount === 0) {
    return 'offline';
  }

  if (runtimeState === 'offline' && presence === 'offline' && openTaskCount === 0 && !hasRecentDerivedActivity) {
    return 'offline';
  }

  if (runtimeState === 'blocked' || blockedTaskCount > 0) {
    return 'blocked';
  }

  if (runtimeState === 'running' || activeTaskCount > 0 || hasRecentDerivedActivity) {
    return hasRecentSignal ? 'working' : hasTimedSignal ? 'stale' : 'offline';
  }

  if (presence === 'online') {
    return 'idle';
  }

  if (openTaskCount > 0 || (hasRuntimeState && (runtimeState === 'idle' || runtimeState === 'online'))) {
    return hasTimedSignal ? 'stale' : 'idle';
  }

  return hasTimedSignal ? 'stale' : 'offline';
}

function toLegacyState(workState: WorkState, presence: Presence): string {
  if (workState === 'working') return 'running';
  if (workState === 'blocked') return 'blocked';
  if (workState === 'idle') return 'idle';
  if (workState === 'stale') return presence === 'online' ? 'idle' : 'offline';
  return 'offline';
}

function deriveCurrentTask(
  runtimeCurrentTask: string | null | undefined,
  workState: WorkState,
  latestTask: TaskHeadlineRow | undefined,
  latestEvent: TaskEventRow | undefined
) {
  if (runtimeCurrentTask?.trim()) return runtimeCurrentTask.trim();
  if (workState === 'working' || workState === 'blocked' || workState === 'stale') {
    return latestTask?.title || latestEvent?.task_title || null;
  }
  if (workState === 'idle' && latestTask?.status === 'blocked') {
    return latestTask.title;
  }
  return null;
}

function shouldUseDerivedStatus(params: {
  runtimeState: string;
  runtimeLastSeenAt: string | null;
  latestTaskActivityAt: string | null;
  latestActorEventAt: string | null;
  workState: WorkState;
}) {
  const { runtimeState, runtimeLastSeenAt, latestTaskActivityAt, latestActorEventAt, workState } = params;
  const runtimePresence = derivePresence(runtimeLastSeenAt, null);
  const hasTaskSignal = Boolean(latestTaskActivityAt || latestActorEventAt);

  if (!hasTaskSignal) return false;
  if (runtimePresence !== 'online') return true;
  if (runtimeState === 'idle' && (workState === 'working' || workState === 'blocked' || workState === 'stale')) return true;
  if (runtimeState === 'offline' && workState !== 'offline') return true;
  return false;
}

async function queryRuntimeAgents(pool: ReturnType<typeof getPgPool>): Promise<RuntimeAgentRow[]> {
  try {
    const result = await pool.query<RuntimeAgentRow>(`
      SELECT
        id,
        agent_key,
        display_name,
        description,
        state,
        last_seen_at,
        current_task,
        status_source,
        work_started_at,
        last_idle_at,
        presence
      FROM agents
      ORDER BY last_seen_at DESC NULLS LAST
    `);
    return result.rows;
  } catch (error) {
    console.warn('Falling back to legacy agents query:', error);

    const legacyResult = await pool.query<Pick<RuntimeAgentRow, 'id' | 'agent_key' | 'display_name' | 'state' | 'last_seen_at'>>(`
      SELECT
        id,
        agent_key,
        display_name,
        state,
        last_seen_at
      FROM agents
      ORDER BY last_seen_at DESC NULLS LAST
    `);

    return legacyResult.rows.map((row) => ({
      ...row,
      description: null,
      current_task: null,
      status_source: 'runtime',
      work_started_at: null,
      last_idle_at: null,
      presence: null,
    }));
  }
}

async function queryOptionalRows<T>(label: string, query: () => Promise<{ rows: T[] }>): Promise<T[]> {
  try {
    const result = await query();
    return result.rows;
  } catch (error) {
    console.warn(`Skipping ${label} for /api/agents:`, error);
    return [];
  }
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  const pool = getPgPool(databaseUrl);
  const rosterKeys = KNOWN_TEAM_ROSTER.map((agent) => agent.agent_key);

  try {
    const runtimeRows = await queryRuntimeAgents(pool);
    const [taskSummaryRows, latestTaskRows, latestEventRows] = await Promise.all([
      queryOptionalRows('task summary query', () =>
        pool.query<TaskSummaryRow>(
          `
            SELECT
              owner AS agent_key,
              COUNT(*) FILTER (WHERE COALESCE(status, 'todo') NOT IN ('done', 'completed')) AS open_task_count,
              COUNT(*) FILTER (WHERE status IN ('in_progress', 'checklist')) AS active_task_count,
              COUNT(*) FILTER (WHERE status = 'blocked' OR blocker IS TRUE) AS blocked_task_count,
              MAX(updated_at) AS latest_task_activity_at
            FROM tasks
            WHERE owner = ANY($1::text[])
            GROUP BY owner
          `,
          [rosterKeys]
        )
      ),
      queryOptionalRows('latest task query', () =>
        pool.query<TaskHeadlineRow>(
          `
            SELECT DISTINCT ON (owner)
              owner AS agent_key,
              id AS task_id,
              title,
              status,
              blocker,
              updated_at
            FROM tasks
            WHERE owner = ANY($1::text[])
            ORDER BY
              owner,
              CASE WHEN COALESCE(status, 'todo') NOT IN ('done', 'completed') THEN 0 ELSE 1 END,
              updated_at DESC NULLS LAST,
              id DESC
          `,
          [rosterKeys]
        )
      ),
      queryOptionalRows('latest task event query', () =>
        pool.query<TaskEventRow>(
          `
            SELECT DISTINCT ON (te.actor)
              te.actor AS agent_key,
              te.created_at AS latest_event_at,
              te.event_type,
              t.title AS task_title
            FROM task_events te
            LEFT JOIN tasks t ON t.id = te.task_id
            WHERE te.actor = ANY($1::text[])
            ORDER BY te.actor, te.created_at DESC, te.id DESC
          `,
          [rosterKeys]
        )
      ),
    ]);

    const runtimeByKey = new Map(runtimeRows.map((row) => [row.agent_key, row]));
    const taskSummaryByKey = new Map(taskSummaryRows.map((row) => [row.agent_key, row]));
    const latestTaskByKey = new Map(latestTaskRows.map((row) => [row.agent_key, row]));
    const latestEventByKey = new Map(latestEventRows.map((row) => [row.agent_key, row]));

    const merged = new Map<string, any>();
    for (const rosterRow of KNOWN_TEAM_ROSTER) {
      merged.set(rosterRow.agent_key, { ...rosterRow });
    }

    const allAgentKeys = new Set<string>([
      ...Array.from(merged.keys()),
      ...Array.from(runtimeByKey.keys()),
      ...Array.from(taskSummaryByKey.keys()),
      ...Array.from(latestTaskByKey.keys()),
      ...Array.from(latestEventByKey.keys()),
    ]);

    for (const agentKey of allAgentKeys) {
      const runtimeRow = runtimeByKey.get(agentKey);
      const taskSummary = taskSummaryByKey.get(agentKey);
      const latestTask = latestTaskByKey.get(agentKey);
      const latestEvent = latestEventByKey.get(agentKey);
      const override = AGENT_OVERRIDES[agentKey] || {};

      const runtimeState = normalizeAgentState(runtimeRow?.state);
      const latestObservedAt = getLatestTimestamp(
        runtimeRow?.last_seen_at,
        taskSummary?.latest_task_activity_at,
        latestEvent?.latest_event_at
      );
      const presence = derivePresence(latestObservedAt, runtimeRow?.presence);
      const openTaskCount = toCount(taskSummary?.open_task_count);
      const activeTaskCount = toCount(taskSummary?.active_task_count);
      const blockedTaskCount = toCount(taskSummary?.blocked_task_count);
      const workState = deriveWorkState({
        runtimeState,
        hasRuntimeState: Boolean(runtimeRow?.state),
        presence,
        latestObservedAt,
        latestTaskActivityAt: normalizeTimestamp(taskSummary?.latest_task_activity_at),
        latestActorEventAt: normalizeTimestamp(latestEvent?.latest_event_at),
        openTaskCount,
        activeTaskCount,
        blockedTaskCount,
      });
      const freshnessLevel = getFreshnessLevel(latestObservedAt);
      const freshnessLabel = getFreshnessLabel(latestObservedAt);
      const usedDerivedStatus = shouldUseDerivedStatus({
        runtimeState,
        runtimeLastSeenAt: normalizeTimestamp(runtimeRow?.last_seen_at),
        latestTaskActivityAt: normalizeTimestamp(taskSummary?.latest_task_activity_at),
        latestActorEventAt: normalizeTimestamp(latestEvent?.latest_event_at),
        workState,
      });

      const mergedAgent = {
        ...(merged.get(agentKey) || {}),
        ...(runtimeRow || {}),
        agent_key: agentKey,
        display_name: override.displayName || runtimeRow?.display_name || agentKey,
        description: override.description || runtimeRow?.description || null,
        state: toLegacyState(workState, presence),
        work_state: workState,
        presence,
        last_seen_at: latestObservedAt,
        current_task: deriveCurrentTask(runtimeRow?.current_task, workState, latestTask, latestEvent),
        status_source: usedDerivedStatus ? 'derived' : runtimeRow?.status_source || 'runtime',
        work_started_at: runtimeRow?.work_started_at || null,
        last_idle_at: runtimeRow?.last_idle_at || null,
        freshness_level: freshnessLevel,
        freshness_label: freshnessLabel,
      };

      merged.set(agentKey, mergedAgent);
    }

    const agents = Array.from(merged.values()).sort((a, b) => {
      const aPresence = a.presence === 'online' ? 1 : 0;
      const bPresence = b.presence === 'online' ? 1 : 0;
      if (aPresence !== bPresence) return bPresence - aPresence;

      const aWorking = a.work_state === 'working' || a.work_state === 'blocked' ? 1 : 0;
      const bWorking = b.work_state === 'working' || b.work_state === 'blocked' ? 1 : 0;
      if (aWorking !== bWorking) return bWorking - aWorking;

      const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
      const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
      return bTime - aTime;
    });

    const meta = buildMeta({
      source: 'supabase',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: agents[0]?.last_seen_at || new Date().toISOString(),
    });

    const response = NextResponse.json(
      withLegacyListShape({
        key: 'agents',
        rows: agents,
        data: agents,
        meta,
        extra: {
          timeout_minutes: AGENT_STATUS_TIMEOUT_MINUTES,
          derived_activity_window_minutes: DERIVED_ACTIVITY_WINDOW_MINUTES,
          roster_count: KNOWN_TEAM_ROSTER.length,
          runtime_count: runtimeRows.length,
          derived_count: agents.filter((agent) => agent.status_source === 'derived').length,
        },
      })
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
