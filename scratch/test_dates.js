const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('physical_attendance')
    .select('check_time')
    .order('check_time', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    // Just map to unique days
    const uniqueDays = [...new Set(data.map(d => d.check_time.split('T')[0]))];
    console.log('Recent days with data:', uniqueDays);
    console.log('Raw:', data.slice(0,3));
  }
}

check();
