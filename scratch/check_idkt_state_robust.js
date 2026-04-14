const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHiddenItems() {
  const { data, count, error } = await supabase
    .from('idkt_items')
    .select('name, full_path, is_hidden, type, parent_path', { count: 'exact' });

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Total items in DB: ${count}`);
  const hidden = data.filter(i => i.is_hidden);
  console.log(`Hidden items: ${hidden.length}`);
  
  if (hidden.length > 0) {
    console.log('Sample hidden items:');
    hidden.slice(0, 10).forEach(i => console.log(` - [HIDDEN] ${i.type}: ${i.name} (${i.full_path})`));
  }

  console.log('\nRoot Items (parent_path = /):');
  const rootItems = data.filter(i => i.parent_path === '/' || i.parent_path === '');
  rootItems.forEach(i => {
    console.log(` - [${i.is_hidden ? 'HIDDEN' : 'VISIBLE'}] ${i.type}: ${i.name} (${i.full_path})`);
  });
}

checkHiddenItems();
