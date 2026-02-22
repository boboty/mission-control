#!/bin/bash
# Initialize database with schema and seed data
# Requires: psql command-line tool and DATABASE_URL in .env.local

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL not found in .env.local"
  exit 1
fi

echo "Initializing database..."
echo "Schema: db/schema.sql"
echo "Seed: db/seed.sql"
echo ""

# Run schema
echo "Creating tables..."
psql "$DATABASE_URL" -f db/schema.sql

# Run seed
echo "Seeding data..."
psql "$DATABASE_URL" -f db/seed.sql

echo ""
echo "✓ Database initialized successfully!"
