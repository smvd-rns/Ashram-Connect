const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local from the root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_IDKT_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_IDKT_ANON_KEY;

console.log("URL:", url);
console.log("Key length:", key ? key.length : 0);

if (!url || !key) {
    console.error("Missing IDKT environment variables");
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    console.log("Querying idkt_items...");
    const { data, error } = await supabase
        .from('idkt_items')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error querying idkt_items:", error);
    } else {
        console.log("Success! Found items:", data.length);
    }
}

test();
