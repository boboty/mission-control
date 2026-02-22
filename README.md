# Mission Control MVP

Next.js + TypeScript + Tailwind dashboard for mission control operations with Supabase backend.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

The `.env.local` file should contain your `DATABASE_URL`. Example:

```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
NEXT_PUBLIC_APP_NAME="Mission Control"
```

**Note:** Do not commit `.env.local` to version control.

### 3. Initialize Database

**Option A: Using psql (if installed)**
```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

**Option B: Using Node.js (no psql required)**
```bash
node db/run-sql.mjs
```

This script reads your `.env.local` file and executes both schema.sql and seed.sql using the `pg` client.

**Option C: Using the init script**
```bash
./db/init.sh
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mission-control/
├── src/
│   └── app/
│       ├── page.tsx          # Dashboard homepage (live data)
│       ├── layout.tsx        # Root layout
│       ├── globals.css       # Global styles
│       └── api/              # Server-side data access layer
│           ├── tasks/
│           ├── pipelines/
│           ├── events/
│           ├── agents/
│           ├── memories/
│           └── health/
├── db/
│   ├── schema.sql            # Database schema
│   ├── seed.sql              # Sample data
│   ├── run-sql.mjs           # Node.js script to run SQL (no psql needed)
│   └── init.sh               # Shell initialization script
├── .env.local                # Environment variables (gitignored)
├── package.json
└── README.md
```

## Database Schema

Tables created by `db/schema.sql`:

- **tasks** - Task board with status, priority, owner, blockers
- **pipelines** - Content pipeline stages (draft, planning, recording, editing)
- **events** - Calendar events and deadlines
- **memories** - Archive of daily logs, SOPs, decisions, lessons
- **agents** - Team/agent status tracking (active, idle)
- **health_snapshots** - Ops health metrics (blocked count, pending decisions, cron status)

## API Endpoints

Server-side data access layer (all return JSON):

- `GET /api/tasks` - List tasks (ordered by status, priority, due date)
- `GET /api/pipelines` - List pipeline items (ordered by due date)
- `GET /api/events` - List upcoming events (from yesterday onwards)
- `GET /api/agents` - List agents (ordered by state, last seen)
- `GET /api/memories` - List memories (ordered by date, newest first)
- `GET /api/health` - List health snapshots (newest first, limit 10)

Each endpoint returns `{ data: [...], count: N }`.

## Dashboard Modules

All 6 modules now display **live data from Supabase**:

1. **Tasks Board** - Shows task count + preview of top 5 tasks with priority/blocker status
2. **Content Pipeline** - Shows pipeline count + preview of items with stage badges
3. **Calendar** - Shows upcoming event count + preview with formatted dates
4. **Memory Archive** - Shows archive count + preview with category and date
5. **Team Overview** - Shows agent count + preview with status badges
6. **Ops Health** - Shows snapshot count + preview with blocked/pending metrics

## Development

```bash
# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Milestones

- [x] M1: DB schema + seed + frontend skeleton
- [x] M2: All modules reading real data from Supabase
- [ ] M3: Feishu sync + health cards
- [ ] M4: Polish + demo

## License

Internal use only.
