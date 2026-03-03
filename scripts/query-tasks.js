const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzhgwgwqldflbozvhuot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6aGd3Z3dxbGRmbGJvenZodW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NTQ0ODQsImV4cCI6MjA4NzIzMDQ4NH0.3uQBhrG-kFlRTDZ_2LkWhRx5Fk3-DkUmHULzCrxqrEk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('id', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log(JSON.stringify(data, null, 2));
}

main();
