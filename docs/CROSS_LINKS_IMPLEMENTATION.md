# Task #80: Cross-Links Implementation

## Overview
Implemented cross-linking functionality between tasks, pipelines, and events to enable navigation between related items.

## Database Changes

### Migration File
- **File**: `db/migrations/20260308_add_cross_links.sql`
- **Status**: Created (needs manual execution due to connection timeout)

### Schema Changes
Added two columns to the `tasks` table:
- `linked_pipeline_id INTEGER` - References `pipelines(id)`
- `linked_event_id INTEGER` - References `events(id)`

Both columns use `ON DELETE SET NULL` to preserve task integrity when linked items are deleted.

### Indexes Created
- `idx_tasks_linked_pipeline` - For fast pipeline lookups
- `idx_tasks_linked_event` - For fast event lookups

## Code Changes

### Type Definitions (`src/lib/types.ts`)
- Updated `Task` interface to include `linked_pipeline_id` and `linked_event_id`
- Updated `Pipeline` interface to include `linked_task_ids?: number[]`
- Updated `Event` interface to include `linked_task_ids?: number[]`

### Data Utilities (`src/lib/data-utils.ts`)
- **taskToDetail()**: Now includes linked pipelines and events in `relatedObjects` array
- **pipelineToDetail()**: Now includes linked tasks in `relatedObjects` array
- **eventToDetail()**: Now includes linked tasks in `relatedObjects` array

### API Routes

#### Tasks API (`src/app/api/tasks/route.ts`)
- Updated GET query to fetch `linked_pipeline_id` and `linked_event_id`

#### Pipelines API (`src/app/api/pipelines/route.ts`)
- Updated GET query to LEFT JOIN with tasks and aggregate `linked_task_ids` as array

#### Events API (`src/app/api/events/route.ts`)
- Updated GET query to LEFT JOIN with tasks and aggregate `linked_task_ids` as array

### Components

#### DetailModal (`src/components/DetailModal.tsx`)
- Added `onRelatedObjectClick` prop to `DetailModalProps`
- Updated `RelatedObjects` component calls to pass the click handler
- Clicking on related objects now triggers navigation

#### Main Page (`src/app/page.tsx`)
- Added `handleRelatedObjectClick()` function to fetch and display related object details
- Updated `DetailModal` usage to include `onRelatedObjectClick` handler
- Imports updated to include `RelatedObject` type and conversion functions

#### Components Index (`src/components/index.ts`)
- Exported `RelatedObject` type for use in other modules

## User Experience

### Task Detail View
When viewing a task that has linked pipeline or event:
1. "关联对象" (Related Objects) section appears
2. Shows linked pipeline (if any) with pipeline icon
3. Shows linked event (if any) with calendar icon
4. Clicking any related object opens its detail view

### Pipeline Detail View
When viewing a pipeline that has linked tasks:
1. "关联对象" section shows all linked tasks
2. Clicking a task opens its detail view

### Event Detail View
When viewing an event that has linked tasks:
1. "关联对象" section shows all linked tasks
2. Clicking a task opens its detail view

## How to Link Items

### Manual Database Update
```sql
-- Link a task to a pipeline
UPDATE tasks SET linked_pipeline_id = 123 WHERE id = 456;

-- Link a task to an event
UPDATE tasks SET linked_event_id = 789 WHERE id = 456;
```

### Future Enhancement
A UI for linking/unlinking items could be added to the DetailModal edit mode.

## Migration Execution

Due to database connection timeout during development, the migration needs to be run manually:

```bash
cd ~/github/mission-control
node scripts/apply-cross-links.js
```

Or directly via psql:
```sql
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS linked_pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_event_id INTEGER REFERENCES events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_linked_pipeline ON tasks(linked_pipeline_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linked_event ON tasks(linked_event_id);
```

## Testing Checklist
- [ ] Run database migration
- [ ] Manually link some tasks to pipelines/events
- [ ] Open task detail - verify linked items appear
- [ ] Click linked pipeline - verify pipeline detail opens
- [ ] Click linked event - verify event detail opens
- [ ] Open pipeline detail - verify linked tasks appear
- [ ] Open event detail - verify linked tasks appear
- [ ] Verify no console errors

## Files Modified
1. `db/migrations/20260308_add_cross_links.sql` (created)
2. `scripts/apply-cross-links.js` (created)
3. `src/lib/types.ts`
4. `src/lib/data-utils.ts`
5. `src/app/api/tasks/route.ts`
6. `src/app/api/pipelines/route.ts`
7. `src/app/api/events/route.ts`
8. `src/components/DetailModal.tsx`
9. `src/components/index.ts`
10. `src/app/page.tsx`
11. `docs/CROSS_LINKS_IMPLEMENTATION.md` (created)

## Status
✅ Code implementation complete
⏳ Database migration pending manual execution
⏳ Testing pending migration execution
