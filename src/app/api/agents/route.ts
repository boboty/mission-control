import { NextResponse } from 'next/server';
import { createPgClient } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';
import fs from 'fs';
import path from 'path';

/**
 * 从 Agent Status Tracker skill 读取心跳状态
 * 位置：~/.openclaw/run/agent-{agent_key}.heartbeat
 */
async function getAgentStatusFromHeartbeat(): Promise<Record<string, string>> {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
    const heartbeatDir = path.join(homeDir, '.openclaw', 'run');
    
    if (!fs.existsSync(heartbeatDir)) {
      return {};
    }
    
    const files = fs.readdirSync(heartbeatDir);
    const statusMap: Record<string, string> = {};
    const now = Date.now();
    const timeout = 10 * 60 * 1000; // 10 分钟超时
    
    for (const file of files) {
      if (!file.startsWith('agent-') || !file.endsWith('.heartbeat')) {
        continue;
      }
      
      try {
        const filePath = path.join(heartbeatDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        const agentKey = data.agent_key;
        const lastUpdate = data.updated_at || 0;
        const age = now - lastUpdate;
        
        if (age > timeout) {
          // 超时，视为 idle
          statusMap[agentKey] = 'idle';
        } else {
          // 未超时，使用记录的状态
          statusMap[agentKey] = data.state || 'idle';
        }
      } catch (e) {
        // 忽略损坏的文件
      }
    }
    
    return statusMap;
  } catch (e) {
    console.error('Failed to get agent status from heartbeat:', e);
    return {};
  }
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
  }

  // 获取心跳状态
  const heartbeatStatus = await getAgentStatusFromHeartbeat();

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
    `, [Object.keys(heartbeatStatus)]);

    // 合并心跳状态
    const agentsWithRealtimeState = result.rows.map(row => ({
      ...row,
      state: heartbeatStatus[row.agent_key] || row.state,
    }));

    const hasRealtimeData = heartbeatStatus && Object.keys(heartbeatStatus).length > 0;

    const meta = buildMeta({
      source: hasRealtimeData ? 'supabase+heartbeat' : 'supabase',
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
