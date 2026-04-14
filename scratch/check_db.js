const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const path = "/02_-_ISKCON_Swamis/";
  console.log("Checking path:", path);
  
  const { data: folder } = await supabase.from('idkt_items').select('*').eq('full_path', path).single();
  console.log("Folder status:", folder);
  
  const { count: children } = await supabase.from('idkt_items').select('*', { count: 'exact', head: true }).eq('parent_path', path);
  console.log("Children count:", children);
  
  const { data: nextPriority } = await supabase.from("idkt_items")
    .select("full_path")
    .eq("is_scanned", false)
    .eq("type", "folder")
    .lt("error_count", 3)
    .like("full_path", `${path}%`)
    .limit(5);
  console.log("Next priority candidates:", nextPriority);
}
check();
