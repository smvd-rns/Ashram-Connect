const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clear() {
  const { error } = await supabase.from('prasadam_daily_counts').delete().neq('day', '1970-01-01');
  if (error) console.error(error);
  else console.log("Cleared table!");
}
clear();
