const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not configured');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    
    // Task IDs to update (from API response):
    // id: 3 = T-20260222-001 (in_progress -> done)
    // id: 4 = T-20260222-003 (in_progress -> done)
    // id: 5 = T-20260221-013 (blocked -> done)
    // id: 6 = T-20260221-020 (blocked -> done)
    
    const tasksToUpdate = [
      { id: 3, title: 'T-20260222-001', status: 'done', next_action: '自验收完成：截图+API 样例已提供，UI 可见，build 通过' },
      { id: 4, title: 'T-20260222-003', status: 'done', next_action: '自验收完成：截图 +API 样例已提供，UI 可见，build 通过' },
      { id: 5, title: 'T-20260221-013', status: 'done', next_action: '实现完成：告警卡片已部署到首页，/api/decisions 口径 blocked-only，截图+API 样例已提供' },
      { id: 6, title: 'T-20260221-020', status: 'done', next_action: '实现完成：决策中心已部署到首页，一键复制上下文功能可用，截图+API 样例已提供' },
    ];
    
    console.log('Updating task status...\n');
    
    for (const task of tasksToUpdate) {
      const query = `
        UPDATE tasks 
        SET status = $1, next_action = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, title, status, next_action, updated_at
      `;
      
      const result = await client.query(query, [task.status, task.next_action, task.id]);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(`✓ ${task.title} (id=${row.id})`);
        console.log(`  Status: ${row.status}`);
        console.log(`  Next Action: ${row.next_action}`);
        console.log(`  Updated: ${row.updated_at}`);
        console.log();
      } else {
        console.log(`✗ ${task.title} (id=${task.id}) - No rows updated`);
        console.log();
      }
    }
    
    // Verify the update
    console.log('\nVerification - Current task status:');
    console.log('─'.repeat(80));
    
    const verifyQuery = `
      SELECT id, title, status, next_action, updated_at
      FROM tasks
      WHERE id IN (3, 4, 5, 6)
      ORDER BY id
    `;
    
    const verifyResult = await client.query(verifyQuery);
    verifyResult.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.title.substring(0, 50)}... [${row.status}]`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
