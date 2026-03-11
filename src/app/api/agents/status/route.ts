import { NextResponse } from 'next/server';
import { getPgPool } from '../../_lib/pg';

// 允许的状态值
const ALLOWED_STATES = new Set(['running', 'idle', 'active', 'online', 'offline', 'blocked', 'working']);

// 允许的 presence 值
const ALLOWED_PRESENCE = new Set(['online', 'offline', 'unknown']);

/**
 * 标准化状态值
 * working -> running
 * active/online -> online
 * 其他保持原样或默认 idle
 */
function normalizeState(state: string | null | undefined): string {
  if (!state) return 'idle';
  if (state === 'working') return 'running';
  if (state === 'active' || state === 'online') return 'online';
  return ALLOWED_STATES.has(state) ? state : 'idle';
}

/**
 * 推导 presence 状态
 * offline -> offline
 * 其他 -> online
 */
function derivePresence(state: string): 'online' | 'offline' {
  if (state === 'offline') return 'offline';
  return 'online';
}

/**
 * POST /api/agents/status
 * 
 * 接收 agent 状态上报并写入数据库
 * 
 * Body:
 * - agent_key: string (必需) - agent 唯一标识
 * - state: string (必需) - 状态：running|idle|online|offline|blocked
 * - display_name?: string - 显示名称（可选，首次上报时使用）
 * - description?: string - 描述（可选）
 * - current_task?: string - 当前任务（可选）
 * - status_source?: string - 状态来源（可选，默认 'runtime'）
 * - presence?: string - 在线状态（可选，自动推导）
 */
export async function POST(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      agent_key,
      state,
      display_name,
      description,
      current_task,
      status_source,
      presence: inputPresence,
    } = body;

    // 验证必需字段
    if (!agent_key) {
      return NextResponse.json({ error: 'Missing agent_key' }, { status: 400 });
    }
    
    if (!state) {
      return NextResponse.json({ error: 'Missing state' }, { status: 400 });
    }

    // 排除 boss（boss 不是 agent）
    if (agent_key === 'boss') {
      return NextResponse.json({ 
        error: 'boss is not an agent, use user status endpoint instead',
        success: false,
      }, { status: 400 });
    }

    const pool = getPgPool(databaseUrl);
    const normalizedState = normalizeState(state);
    const presence = inputPresence && ALLOWED_PRESENCE.has(inputPresence) 
      ? inputPresence 
      : derivePresence(normalizedState);

    // 构建 SQL，根据状态更新时间戳字段
    const workStartedAt = normalizedState === 'running' ? 'NOW()' : 'agents.work_started_at';
    const lastIdleAt = normalizedState === 'idle' || normalizedState === 'offline' ? 'NOW()' : 'agents.last_idle_at';

    await pool.query(
      `INSERT INTO agents (
         agent_key, 
         display_name, 
         description, 
         state, 
         presence, 
         current_task, 
         status_source, 
         last_seen_at, 
         work_started_at, 
         last_idle_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, NOW(), 
         CASE WHEN $4 = 'running' THEN NOW() ELSE NULL END,
         CASE WHEN $4 IN ('idle', 'offline') THEN NOW() ELSE NULL END
       )
       ON CONFLICT (agent_key) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
         description = COALESCE(EXCLUDED.description, agents.description),
         state = EXCLUDED.state,
         presence = EXCLUDED.presence,
         current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
         status_source = COALESCE(EXCLUDED.status_source, agents.status_source, 'runtime'),
         last_seen_at = NOW(),
         work_started_at = ${workStartedAt},
         last_idle_at = ${lastIdleAt}`,
      [
        agent_key,
        display_name || agent_key,
        description || null,
        normalizedState,
        presence,
        current_task || null,
        status_source || 'runtime',
      ]
    );

    return NextResponse.json({
      success: true,
      agent_key,
      state: normalizedState,
      presence,
      current_task: current_task || null,
      status_source: status_source || 'runtime',
      last_seen_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json({ 
      error: 'Failed to update status',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

/**
 * PUT /api/agents/status
 * 
 * 批量更新多个 agent 状态（可选扩展）
 */
export async function PUT(request: Request) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { agents } = body;

    if (!Array.isArray(agents)) {
      return NextResponse.json({ error: 'Expected agents array' }, { status: 400 });
    }

    const pool = getPgPool(databaseUrl);
    const results = [];

    for (const agent of agents) {
      const {
        agent_key,
        state,
        display_name,
        description,
        current_task,
        status_source,
      } = agent;

      if (!agent_key || !state) continue;

      const normalizedState = normalizeState(state);
      const presence = derivePresence(normalizedState);
      const workStartedAt = normalizedState === 'running' ? 'NOW()' : 'agents.work_started_at';
      const lastIdleAt = normalizedState === 'idle' || normalizedState === 'offline' ? 'NOW()' : 'agents.last_idle_at';

      await pool.query(
        `INSERT INTO agents (
           agent_key, display_name, description, state, presence, current_task, status_source, last_seen_at, work_started_at, last_idle_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 
           CASE WHEN $4 = 'running' THEN NOW() ELSE NULL END,
           CASE WHEN $4 IN ('idle', 'offline') THEN NOW() ELSE NULL END)
         ON CONFLICT (agent_key) DO UPDATE SET
           display_name = COALESCE(EXCLUDED.display_name, agents.display_name),
           description = COALESCE(EXCLUDED.description, agents.description),
           state = EXCLUDED.state,
           presence = EXCLUDED.presence,
           current_task = COALESCE(EXCLUDED.current_task, agents.current_task),
           status_source = COALESCE(EXCLUDED.status_source, agents.status_source, 'runtime'),
           last_seen_at = NOW(),
           work_started_at = ${workStartedAt},
           last_idle_at = ${lastIdleAt}`,
        [
          agent_key,
          display_name || agent_key,
          description || null,
          normalizedState,
          presence,
          current_task || null,
          status_source || 'runtime',
        ]
      );

      results.push({
        agent_key,
        state: normalizedState,
        presence,
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error bulk updating agent statuses:', error);
    return NextResponse.json({ error: 'Failed to bulk update statuses' }, { status: 500 });
  }
}
