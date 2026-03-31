require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentLogs() {
  const { data, error } = await supabase
    .from('physical_attendance')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n--- RECENT ATTENDANCE LOGS ---');
  console.table(data.map(r => ({
    id: r.id,
    sn: r.device_sn,
    user: r.zk_user_id,
    time: r.created_at,
    payload: r.raw_payload ? r.raw_payload.slice(0, 40) : 'N/A'
  })));
}

checkRecentLogs();
