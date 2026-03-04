import { NextResponse } from 'next/server';
import { createPgClient } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 获取当前运行的子代理状态
 * 通过调用 openclaw sessions_list 获取实时状态
 */
async function getActiveSubagents(): Promise<Record<string, string>> {
  try {
    const { stdout } = await execAsync('openclaw sessions_list --kinds subagent --activeMinutes 5 2>/dev/null || echo ""', {
      timeout: 3000,
    });
    
    const activeMap: Record<string, string> = {};
    
    // 解析输出，提取 agent_key 和状态
    // 格式类似：agent:agent_code:subagent:xxx - running
    const lines = stdout.split('\n');
    for (const line of lines) {
      const match = line.match(/agent:([^:]+):subagent:[^\s]+\s+-\s+(\w+)/);
      if (match) {
        const [, agentKey, status] = match;
        // 映射状态
        activeMap[agentKey] = status === 'running' ? 'running' : 'active';
      }
    }
    
    return activeMap;
  } catch (e) {
    console.error('Failed to get active subagents:', e);
    return {};
  }
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  // 获取实时子代理状态
  const activeSubagents = await getActiveSubagents();

  const client = createPgClient(databaseUrl);

  try {
    await client.connect();
    const result = await client.query(`
      SELECT id, agent_key, display_name, description, state, last_seen_at
      FROM agents
      ORDER BY 
        CASE 
          WHEN agent_key = ANY($1) THEN 1
          ELSE 2
        END,
        state DESC, 
        last_seen_at DESC NULLS LAST
      LIMIT 20
    `, [Object.keys(activeSubagents)]);

    // 合并实时状态
    const agentsWithRealtimeState = result.rows.map(row => ({
      ...row,
      state: activeSubagents[row.agent_key] || row.state,
    }));

    const meta = buildMeta({
      source: 'supabase+runtime',
      lastSyncAt: new Date().toISOString(),
      dataUpdatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      withLegacyListShape({
        key: 'agents',
        rows: agentsWithRealtimeState,
        data: agentsWithRealtimeState,
        meta,
      })
    );
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  } finally {
    await client.end();
  }
}
