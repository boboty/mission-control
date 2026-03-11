import { Pool } from 'pg';

// 使用 pooler URL（与 .env.local 一致）
const DATABASE_URL = 'postgresql://postgres.lzhgwgwqldflbozvhuot:r7gMOQT2hqMWPauK@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({ 
  connectionString: DATABASE_URL, 
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000
});

async function exec(sql, name) {
  try {
    await pool.query(sql);
    console.log('✅', name);
  } catch (err) {
    if (err.code === '42701' || err.code === '42P07') {
      console.log('⊗', name, '(已存在)');
    } else {
      console.log('❌', name, err.message.substring(0, 80));
    }
  }
}

console.log('🚀 开始执行 Agent Runtime Status 迁移...\n');

// 添加新列
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS status_source TEXT', 'agents.status_source');
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS current_task TEXT', 'agents.current_task');
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS work_started_at TIMESTAMPTZ', 'agents.work_started_at');
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_idle_at TIMESTAMPTZ', 'agents.last_idle_at');
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS presence TEXT', 'agents.presence');
await exec('ALTER TABLE agents ADD COLUMN IF NOT EXISTS description TEXT', 'agents.description');

// 设置默认值
await exec("UPDATE agents SET status_source = 'runtime' WHERE status_source IS NULL", 'SET status_source DEFAULT');
await exec("UPDATE agents SET presence = 'unknown' WHERE presence IS NULL", 'SET presence DEFAULT');

// 创建索引
await exec('CREATE INDEX IF NOT EXISTS idx_agents_last_seen_at ON agents(last_seen_at DESC)', 'idx_agents_last_seen_at');
await exec('CREATE INDEX IF NOT EXISTS idx_agents_work_started_at ON agents(work_started_at DESC)', 'idx_agents_work_started_at');
await exec('CREATE INDEX IF NOT EXISTS idx_agents_presence ON agents(presence)', 'idx_agents_presence');
await exec('CREATE INDEX IF NOT EXISTS idx_agents_state ON agents(state)', 'idx_agents_state');
await exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_agent_key ON agents(agent_key)', 'idx_agents_agent_key (unique)');

await pool.end();
console.log('\n✅ Agent Runtime Status 迁移完成');
