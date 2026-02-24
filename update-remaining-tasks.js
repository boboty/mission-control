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
    
    // Remaining tasks to update to checklist:
    // id: 1 = T-20260221-024 (PM 验收与发布清单) - needs user final confirmation
    // id: 2 = T-20260221-014 (MVP 联调验收与演示准备) - needs user final confirmation
    
    const tasksToUpdate = [
      { 
        id: 1, 
        title: 'T-20260221-024', 
        status: 'checklist', 
        next_action: '待用户最终验收：确认发布清单完整性，批准上线' 
      },
      { 
        id: 2, 
        title: 'T-20260221-014', 
        status: 'checklist', 
        next_action: '待用户最终验收：确认 MVP 联调结果，批准演示' 
      },
    ];
    
    console.log('Updating remaining tasks to checklist status...\n');
    
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
    console.log('\nVerification - Current active task status:');
    console.log('─'.repeat(80));
    
    const verifyQuery = `
      SELECT id, title, status, next_action, updated_at
      FROM tasks
      WHERE status != 'done'
      ORDER BY id
    `;
    
    const verifyResult = await client.query(verifyQuery);
    verifyResult.rows.forEach(row => {
      console.log(`ID ${row.id}: ${row.title.substring(0, 50)}... [${row.status}]`);
      console.log(`  Next Action: ${row.next_action}`);
    });
    
    // Count by status
    console.log('\n\nStatus summary:');
    console.log('─'.repeat(80));
    const countQuery = `
      SELECT status, COUNT(*) as count
      FROM tasks
      GROUP BY status
      ORDER BY status
    `;
    const countResult = await client.query(countQuery);
    countResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

main();
