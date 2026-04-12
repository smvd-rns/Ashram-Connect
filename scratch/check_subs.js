
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSubs() {
  const { data, count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact' });
  
  if (error) {
    console.error('Error fetching subscriptions:', error);
  } else {
    console.log('Total subscriptions:', count);
    console.log('Providers:', Array.from(new Set(data.map(s => s.provider))));
  }
}

checkSubs();
