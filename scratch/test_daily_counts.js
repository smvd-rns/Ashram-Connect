const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('prasadam_daily_counts')
    .select('*')
    .order('day', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Daily Counts:', data);
  }
}

check();
