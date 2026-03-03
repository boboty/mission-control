const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzhgwgwqldflbozvhuot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aGd3Z3dxbGRmbGJvenZodW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTQ0ODQsImV4cCI6MjA4NzIzMDQ4NH0.3uQBhrG-kFlRTDZ_2LkWhRx5Fk3-DkUmHULzCrxqrEk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Get all tasks with pagination - fetch all
  let allTasks = [];
  let page = 0;
  const pageSize = 100;
  
  while (true) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    if (!data || data.length === 0) break;
    allTasks = allTasks.concat(data);
    page++;
    if (data.length < pageSize) break;
  }
  
  console.log('Total tasks:', allTasks.length);
  console.log('\nTasks by status:');
  
  const counts = {};
  allTasks.forEach(t => {
    counts[t.status] = (counts[t.status] || 0) + 1;
  });
  
  console.log(counts);
  
  console.log('\n--- BLOCKED TASKS ---');
  const blocked = allTasks.filter(t => t.status === 'blocked');
  blocked.slice(0, 10).forEach(t => {
    console.log(`[${t.id}] ${t.title} | owner: ${t.owner} | next_action: ${t.next_action || 'N/A'}`);
  });
  if (blocked.length > 10) console.log(`... and ${blocked.length - 10} more`);
  
  console.log('\n--- CHECKLIST TASKS ---');
  const checklist = allTasks.filter(t => t.status === 'checklist');
  checklist.slice(0, 10).forEach(t => {
    console.log(`[${t.id}] ${t.title} | owner: ${t.owner}`);
  });
  if (checklist.length > 10) console.log(`... and ${checklist.length - 10} more`);
  
  console.log('\n--- IN_PROGRESS TASKS ---');
  const inProgress = allTasks.filter(t => t.status === 'in_progress');
  inProgress.forEach(t => {
    const updated = new Date(t.updated_at);
    const now = new Date();
    const hoursDiff = (now - updated) / (1000 * 60 * 60);
    console.log(`[${t.id}] ${t.title} | owner: ${t.owner} | updated: ${t.updated_at} (${hoursDiff.toFixed(1)}h ago)`);
  });
  
  console.log('\n--- TODO TASKS ---');
  const todo = allTasks.filter(t => t.status === 'todo');
  todo.slice(0, 10).forEach(t => {
    console.log(`[${t.id}] ${t.title} | owner: ${t.owner}`);
  });
  if (todo.length > 10) console.log(`... and ${todo.length - 10} more`);
}

main();
