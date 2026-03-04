import { Pool } from 'pg';

// Create a pg Pool with predictable SSL behavior.
// We parse the URL ourselves and always force TLS without cert verification (Supabase managed certs).
let _pool: Pool | null = null;

export function getPgPool(databaseUrl: string) {
  if (_pool) return _pool;

  const url = new URL(databaseUrl);

  _pool = new Pool({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },

    // Conservative defaults for Supabase pooler.
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    keepAlive: true,
  });

  // Avoid crashing on idle socket errors.
  _pool.on('error', (err) => {
    console.error('PG pool error:', err);
  });

  return _pool;
}
