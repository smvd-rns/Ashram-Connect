const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://oxffpoqdkaxgbocxbyov.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZmZwb3Fka2F4Z2JvY3hieW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDY4Mjk1OCwiZXhwIjoyMDkwMjU4OTU4fQ._XAY_THkFrsfcYGJZ1aBsA6YkdW5FuzKk7uMtBQf8Uk";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { count: videoCount, error: vError } = await supabase.from('yt_videos').select('*', { count: 'exact', head: true });
    if (vError) console.error("Video count error:", vError);

    const { count: channelCount, error: cError } = await supabase.from('youtube_channels').select('*', { count: 'exact', head: true });
    if (cError) console.error("Channel count error:", cError);

    console.log(`Channels: ${channelCount}, Videos: ${videoCount}`);
    
    const start = Date.now();
    const { data, error: qError } = await supabase.from('youtube_channels').select('*').eq('visibility', 'public');
    if (qError) console.error("Query error:", qError);
    const end = Date.now();
    console.log(`Public channels fetch took ${end - start}ms (found ${data?.length || 0})`);

    // Check recent errors in youtube_channels
    const { data: errorChannels } = await supabase.from('youtube_channels').select('name, sync_error').not('sync_error', 'is', null).limit(5);
    console.log("Recent sync errors:", JSON.stringify(errorChannels, null, 2));

  } catch (err) {
    console.error("Execution error:", err);
  }
}

check();
