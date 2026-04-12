
const { createClient } = require('@supabase/supabase-js');
const { notifyAllUsers } = require('../src/lib/notifications');
const dotenv = require('dotenv');
const path = require('path');

// Manually load env from .env.local
const fs = require('fs');
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

async function testBroadcast() {
  console.log("Testing broadcast with notifyAllUsers...");
  try {
    await notifyAllUsers({
      title: "Test Notification",
      body: "This is a test from the terminal."
    });
    console.log("Test complete.");
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

testBroadcast();
