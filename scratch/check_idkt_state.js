const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkHiddenItems() {
  const { data, count, error } = await supabase
    .from('idkt_items')
    .select('name, full_path, is_hidden, type', { count: 'exact' });

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Total items: ${count}`);
  const hidden = data.filter(i => i.is_hidden);
  console.log(`Hidden items: ${hidden.length}`);
  if (hidden.length > 0) {
    console.log('Sample hidden items:', hidden.slice(0, 5).map(i => i.full_path));
  }

  const rootItems = data.filter(i => i.parent_path === '/' || i.parent_path === '');
  console.log(`Root items found: ${rootItems.length}`);
  rootItems.forEach(i => {
    console.log(` - [${i.is_hidden ? 'HIDDEN' : 'VISIBLE'}] ${i.type}: ${i.name} (${i.full_path})`);
  });
}

checkHiddenItems();
