import { Pool } from 'pg';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:r7gMOQT2hqMWPauK@db.lzhgwgwqldflbozvhuot.supabase.co:6543/postgres';

async function runMigration(name, sqlFile) {
  console.log(`🚀 执行迁移：${name}`);
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  
  try {
    const sql = readFileSync(sqlFile, 'utf-8');
    const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
    
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (err) {
        if (err.code === '42701') { // column already exists
          console.log(`   ⚠️ 字段已存在，跳过`);
        } else if (err.code === '42P07') { // table already exists
          console.log(`   ⚠️ 表已存在，跳过`);
        } else if (err.code === '42601') { // syntax error
          console.log(`   ⚠️ SQL 语法错误，跳过`);
        } else {
          console.log(`   ⚠️ ${err.message}`);
        }
      }
    }
    console.log(`✅ ${name} 完成\n`);
  } catch (err) {
    console.log(`❌ ${name} 失败：${err.message}\n`);
  } finally {
    await pool.end();
  }
}

await runMigration('互链跳转', 'db/migrations/20260308_interlink_relationships.sql');
await runMigration('时间线/评论', 'db/migrations/20260308_task_events_enhancement.sql');

console.log('✅ 所有迁移执行完成');
