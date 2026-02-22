import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
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

const schema = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');
const seed = fs.readFileSync(path.join(root, 'db', 'seed.sql'), 'utf8');

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(schema);
  await client.query(seed);
  console.log('DB initialized via pg client');
} catch (e) {
  console.error('DB init failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
