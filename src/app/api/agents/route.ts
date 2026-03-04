import { NextResponse } from 'next/server';
import { createPgClient } from '../_lib/pg';
import { buildMeta, withLegacyListShape } from '../_lib/response';
import fs from 'fs';
import path from 'path';

/**
 * 从 OpenClaw runtime 读取子代理状态
 * 解析 ~/.openclaw/run/sessions.json 或类似文件
 */
async function getActiveSubagents(): Promise<Record<string, string>> {
  try {
    // 尝试读取 sessions 状态文件
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/root';
    const sessionsPath = path.join(homeDir, '.openclaw', 'run', 'sessions.json');
    
    if (fs.existsSync(sessionsPath)) {
      const content = fs.readFileSync(sessionsPath, 'utf8');
      const sessions = JSON.parse(content);
      
      const activeMap: Record<string, string> = {};
      const now = Date.now();
      const activeThreshold = 5 * 60 * 1000; // 5 分钟
      
      // 查找最近活跃的子代理
      for (const session of sessions) {
        if (session.kind === 'subagent' && session.lastActiveAt) {
          const lastActive = new Date(session.lastActiveAt).getTime();
          if (now - lastActive < activeThreshold) {
            // 从 sessionKey 提取 agent_key
            // 格式：agent:agent_code:subagent:xxx
            const match = session.sessionKey?.match(/agent:([^:]+):subagent:/);
            if (match) {
              const [, agentKey] = match;
              activeMap[agentKey] = session.status === 'running' ? 'running' : 'active';
            }
          }
        }
      }
      
      return activeMap;
    }
    
    return {};
  } catch (e) {
    console.error('Failed to get active subagents from file:', e);
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
      source: activeSubagents && Object.keys(activeSubagents).length > 0 ? 'supabase+runtime' : 'supabase',
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
