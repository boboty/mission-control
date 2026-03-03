import { Client } from 'pg';

// Create a pg Client with predictable SSL behavior.
// NOTE: Using `connectionString` + `ssl` together can behave unexpectedly depending on pg parser.
// We parse the URL ourselves and always force TLS without cert verification (Supabase managed certs).
export function createPgClient(databaseUrl: string) {
  const url = new URL(databaseUrl);

  return new Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
  });
}
