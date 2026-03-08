const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:r7gMOQT2hqMWPauK@db.lzhgwgwqldflbozvhuot.supabase.co:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  let client;
  try {
    client = await pool.connect();
    console.log('✓ Connected to database');
    
    // Check if task_events table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_events'
      ) as table_exists
    `);
    
    const tableExists = result.rows[0].table_exists;
    console.log(`task_events table exists: ${tableExists}`);
    
    if (tableExists) {
      // Check columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'task_events'
        ORDER BY ordinal_position
      `);
      
      console.log('\nColumns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      // Count records
      const count = await client.query('SELECT COUNT(*) FROM task_events');
      console.log(`\nTotal records: ${count.rows[0].count}`);
    } else {
      console.log('\nCreating task_events table...');
      await client.query(`
        CREATE TABLE task_events (
          id SERIAL PRIMARY KEY,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
          old_value VARCHAR(255),
          new_value VARCHAR(255) NOT NULL,
          actor VARCHAR(100),
          comment TEXT,
          meta JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('✓ Table created');
      
      // Create indexes
      await client.query('CREATE INDEX idx_task_events_task_id ON task_events(task_id)');
      await client.query('CREATE INDEX idx_task_events_created_at ON task_events(created_at)');
      await client.query('CREATE INDEX idx_task_events_event_type ON task_events(event_type)');
      console.log('✓ Indexes created');
    }
    
    console.log('\n✓ Database setup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

check();
