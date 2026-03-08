const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of env) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const migrationSQL = `
-- Mission Control: Task/Pipeline/Event Cross-Links
-- Adds support for linking tasks to pipelines and events

-- Add cross-link columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id);

-- Add comment for documentation
COMMENT ON COLUMN tasks.linked_pipeline_id IS 'Associated pipeline ID (if this task is linked to a pipeline item)';
COMMENT ON COLUMN tasks.linked_event_id IS 'Associated event ID (if this task is linked to a calendar event)';
`;

const client = new Client({ 
  connectionString: databaseUrl, 
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 30000
});

async function runMigration() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected. Executing migration...');
    
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    
    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name IN ('linked_pipeline_id', 'linked_event_id')
      ORDER BY column_name;
    `);
    
    console.log('Added columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed');
  }
}

runMigration();
