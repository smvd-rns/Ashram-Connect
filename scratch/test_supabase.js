const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", url);
console.log("Anon Key Length:", anon ? anon.length : "MISSING");
console.log("Service Key Length:", service ? service.length : "MISSING");

const supabase = createClient(url, service);

async function test() {
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.error("Connection Error:", JSON.stringify(error, null, 2));
    } else {
      console.log("Connection Successful! Data:", data);
    }
  } catch (e) {
    console.error("Catch Error:", e);
  }
}

test();
