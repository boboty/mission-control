#!/usr/bin/env node
/**
 * Heartbeat Task Check - Supabase Implementation
 * 
 * Checks for:
 * - Blocked tasks (status='blocked')
 * - Stale in-progress tasks (status='in_progress' AND updated_at > 2h)
 * - Todo P0/P1 items
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration from .env.local
const SUPABASE_URL = 'https://lzhgwgwqldflbozvhuot.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aGd3Z3dxbGRmbGJvenZodW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTQ0ODQsImV4cCI6MjA4NzIzMDQ4NH0.3uQBhrG-kFlRTDZ_2LkWhRx5Fk3-DkUmHULzCrxqrEk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTasks() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  
  console.log('# Heartbeat Snapshot (Supabase)');
  console.log('');
  console.log(`- now: ${now.toISOString()}`);
  console.log('');

  // 1. Check blocked tasks
  console.log('## Blocked (status=blocked)');
  console.log('');
  
  const { data: blockedTasks, error: blockedError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'blocked')
    .neq('status', 'done')
    .order('updated_at', { ascending: false });
  
  if (blockedError) {
    console.error(`Error: ${blockedError.message}`);
  } else if (blockedTasks.length === 0) {
    console.log('- (empty)');
  } else {
    for (const task of blockedTasks) {
      const hoursSinceUpdate = Math.round((now - new Date(task.updated_at)) / (1000 * 60 * 60));
      console.log(`- #${task.id}: ${task.title} (owner: ${task.owner || 'unassigned'}, priority: ${task.priority || 'none'}, updated: ${hoursSinceUpdate}h ago)`);
      if (task.next_action) {
        console.log(`  next: ${task.next_action}`);
      }
    }
  }
  console.log('');

  // 2. Check stale in-progress tasks (> 2h)
  console.log('## Alerts: In Progress stale > 2h');
  console.log('');
  
  const { data: staleTasks, error: staleError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'in_progress')
    .lt('updated_at', twoHoursAgo)
    .order('updated_at', { ascending: true });
  
  if (staleError) {
    console.error(`Error: ${staleError.message}`);
  } else if (staleTasks.length === 0) {
    console.log('- (none)');
  } else {
    for (const task of staleTasks) {
      const hoursSinceUpdate = Math.round((now - new Date(task.updated_at)) / (1000 * 60 * 60));
      console.log(`- #${task.id}: ${task.title} (owner: ${task.owner || 'unassigned'}, stale: ${hoursSinceUpdate}h)`);
    }
  }
  console.log('');

  // 3. Check Todo P0/P1
  console.log('## Todo P0/P1');
  console.log('');
  
  const { data: todoTasks, error: todoError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'todo')
    .in('priority', ['high', 'P0', 'P1'])
    .order('created_at', { ascending: true });
  
  if (todoError) {
    console.error(`Error: ${todoError.message}`);
  } else if (todoTasks.length === 0) {
    console.log('- (none)');
  } else {
    for (const task of todoTasks) {
      console.log(`- #${task.id}: ${task.title} (owner: ${task.owner || 'unassigned'}, priority: ${task.priority || 'none'})`);
    }
  }
  console.log('');

  // Summary
  const totalBlocked = blockedTasks?.length || 0;
  const totalStale = staleTasks?.length || 0;
  const totalTodoP0P1 = todoTasks?.length || 0;
  
  console.log('---');
  console.log(`Summary: ${totalBlocked} blocked, ${totalStale} stale in-progress, ${totalTodoP0P1} todo P0/P1`);
  
  if (totalBlocked === 0 && totalStale === 0 && totalTodoP0P1 === 0) {
    console.log('HEARTBEAT_OK');
  }
}

checkTasks().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
