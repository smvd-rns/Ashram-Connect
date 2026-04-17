const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing ENV vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching from user_favorites:", error);
  } else {
    console.log("Columns in user_favorites:", data.length > 0 ? Object.keys(data[0]) : "Empty table");
  }

  // Also check if user_watch_progress exists
  const { data: progressData, error: progressError } = await supabase
    .from('user_watch_progress')
    .select('*')
    .limit(1);
  
  if (progressError) {
    console.log("user_watch_progress table does not exist or error:", progressError.message);
  } else {
    console.log("user_watch_progress exists!");
  }
}

checkSchema();
