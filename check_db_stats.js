require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRowCounts() {
  const tables = [
    'physical_attendance',
    'harinam_attendance',
    'virtual_machine_attendance',
    'attendance_exceptions',
    'user_visits',
    'profiles',
    'bcdb',
    'attendance_machines',
    'attendance_user_mapping',
    'travel_submissions'
  ];

  console.log('Starting planned row count checks...');
  
  for (const table of tables) {
    console.log(`Checking ${table}...`);
    try {
      const start = Date.now();
      // Use count: 'planned' for EXPLAIN-based fast estimation
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'planned', head: true });
      
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      if (error) {
        console.error(`  Error for ${table}: ${error.message}`);
      } else {
        console.log(`  Success: ${table} has ~${count} rows (took ${elapsed}s)`);
      }
    } catch (e) {
      console.error(`  Exception for ${table}:`, e.message);
    }
  }
  console.log('Done!');
}

checkRowCounts();
