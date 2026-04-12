
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

async function debugNotifications() {
  console.log("--- NOTIFICATION DEBUGGER ---");
  
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  console.log("VAPID Keys present:", !!publicKey, !!privateKey);
  
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails('mailto:test@example.com', publicKey, privateKey);
      console.log("WebPush VAPID configuration successful.");
    } catch (err) {
      console.error("WebPush VAPID configuration failed:", err.message);
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("Checking push_subscriptions count...");
  const { count, error } = await supabase.from('push_subscriptions').select('id', { count: 'exact' });
  if (error) {
    console.error("Supabase Error:", error.message);
  } else {
    console.log("Found", count, "subscriptions.");
  }
}

debugNotifications();
