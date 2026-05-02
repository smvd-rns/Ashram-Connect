/**
 * YouTube Deep Sync Script
 * 
 * Usage: node scripts/sync-youtube.js <channelId>
 * 
 * This script runs locally and bypasses HTTP timeouts.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Env Vars manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split(/\r?\n/).forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length > 0) {
      // Remove possible quotes and trim
      process.env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!YOUTUBE_API_KEY || !supabaseUrl || !supabaseKey) {
  console.error("Error: Missing YOUTUBE_API_KEY or Supabase credentials in .env.local");
  process.exit(1);
}

console.log(`📡 Connection Check: API Key starts with ${YOUTUBE_API_KEY.substring(0, 5)}...`);


const supabase = createClient(supabaseUrl, supabaseKey);
const UPSERT_CHUNK_SIZE = 100; // Efficient for Node
const channelId = process.argv[2];

if (!channelId) {
  console.error("Usage: node scripts/sync-youtube.js <channelId>");
  process.exit(1);
}

async function sync() {
  console.log(`\n🚀 Starting DEEP SYNC for channel: ${channelId}`);
  
  try {
    // 1. Get uploads playlist ID
    const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=contentDetails&key=${YOUTUBE_API_KEY}`);
    const cData = await cRes.json();
    
    if (!cRes.ok) {
      throw new Error(`YouTube Channel API Error: ${cData.error?.message || 'Unknown'}`);
    }

    if (!cData.items || cData.items.length === 0) {
      throw new Error(`Channel not found. Please verify the ID: ${channelId}`);
    }

    const uploadsId = cData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsId) {
      console.error("DEBUG: Channel Response:", JSON.stringify(cData, null, 2));
      throw new Error("Could not find uploads playlist. This channel may not have any public videos or the ID is a User ID instead of a Channel ID.");
    }

    // 2. Paginate through everything
    let nextPageToken = "";
    let totalSynced = 0;
    let pageCount = 0;

    // Update status in DB
    await supabase.from("youtube_channels").update({ sync_status: 'syncing', sync_error: null }).eq("channel_id", channelId);

    do {
      pageCount++;
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("playlistId", uploadsId);
      itemsUrl.searchParams.set("part", "snippet,contentDetails");
      itemsUrl.searchParams.set("maxResults", "50");
      itemsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      if (nextPageToken) itemsUrl.searchParams.set("pageToken", nextPageToken);

      const itemsRes = await fetch(itemsUrl.toString());
      const itemsData = await itemsRes.json();

      if (!itemsRes.ok) {
        throw new Error(`YouTube API Error: ${itemsData.error?.message || 'Unknown'}`);
      }

      const videos = (itemsData.items || [])
        .map((item) => ({
          video_id: item.contentDetails.videoId,
          channel_id: channelId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
          published_at: item.contentDetails.videoPublishedAt,
          kind: 'video',
          updated_at: new Date().toISOString()
        }))
        .filter(v => !!v.video_id);

      if (videos.length > 0) {
        // Upsert in one go or larger chunks
        for (let i = 0; i < videos.length; i += UPSERT_CHUNK_SIZE) {
          const chunk = videos.slice(i, i + UPSERT_CHUNK_SIZE);
          const { error } = await supabase.from("yt_videos").upsert(chunk, { onConflict: "video_id", ignoreDuplicates: true });
          if (error) throw error;
        }
        totalSynced += videos.length;
      }

      nextPageToken = itemsData.nextPageToken || "";
      process.stdout.write(`\r✅ Processed ${pageCount} pages (${totalSynced} videos)...`);

    } while (nextPageToken);

    console.log(`\n\n🎉 Sync complete! Total videos: ${totalSynced}`);

    // Update status in DB
    await supabase.from("youtube_channels").update({ 
      sync_status: 'completed', 
      last_sync_at: new Date().toISOString(),
      sync_error: null,
      sync_cursor: null 
    }).eq("channel_id", channelId);

  } catch (error) {
    console.error(`\n\n❌ Sync failed: ${error.message}`);
    await supabase.from("youtube_channels").update({ sync_status: 'error', sync_error: error.message }).eq("channel_id", channelId);
  }
}

sync();
