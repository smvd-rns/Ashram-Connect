const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_YT_URL;
const supabaseServiceKey = process.env.SUPABASE_YT_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !YOUTUBE_API_KEY) {
  console.error("Missing required environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseISO8601Duration(durationStr) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = (durationStr || "").match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchDurationsBatch(videoIds) {
  const durations = {};
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(",")}&key=${YOUTUBE_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || "YouTube API Error");
    }
    if (data.items) {
      for (const item of data.items) {
        if (item.contentDetails?.duration) {
          durations[item.id] = parseISO8601Duration(item.contentDetails.duration);
        }
      }
    }
  } catch (err) {
    console.error("  [YouTube API Error] Failed to fetch durations:", err.message);
  }
  return durations;
}

async function main() {
  console.log("=== YouTube Video Duration Population Script ===");
  console.log("Fetching total count of videos to update...");

  const { count, error: countError } = await supabase
    .from('yt_videos')
    .select('*', { count: 'exact', head: true })
    .is('duration_seconds', null);

  if (countError) {
    console.error("Failed to fetch initial count:", countError);
    return;
  }

  const totalToProcess = count || 0;
  console.log(`Total remaining videos to process: ${totalToProcess}\n`);

  let hasMore = true;
  let offset = 0;
  const LIMIT = 100;
  let totalProcessed = 0;

  while (hasMore) {
    // 1. Fetch a block of videos from database
    const { data: videos, error } = await supabase
      .from('yt_videos')
      .select('video_id, channel_id, title')
      .is('duration_seconds', null)
      .range(offset, offset + LIMIT - 1);

    if (error) {
      console.error("Database fetch error:", error);
      break;
    }

    if (!videos || videos.length === 0) {
      console.log("No more videos with missing duration found.");
      break;
    }

    console.log(`Processing batch of ${videos.length} videos...`);

    // 2. Split into chunks of 50 for YouTube API
    for (let i = 0; i < videos.length; i += 50) {
      const chunk = videos.slice(i, i + 50);
      const videoIds = chunk.map(v => v.video_id);
      
      const durations = await fetchDurationsBatch(videoIds);

      // 3. Prepare updates for database
      const updates = chunk.map(v => {
        const duration = durations[v.video_id] !== undefined ? durations[v.video_id] : null;
        
        // Exclude Hare Krishna TV UCZ8S3qwowiFztAQBRTawWfA
        const isHkTV = v.channel_id === 'UCZ8S3qwowiFztAQBRTawWfA';
        const isShort = !isHkTV && duration !== null && duration <= 180;

        return {
          video_id: v.video_id,
          channel_id: v.channel_id,
          title: v.title,
          duration_seconds: duration,
          is_short: isShort
        };
      });

      // 4. Upsert the updates back to Supabase (using upsert with video_id onConflict)
      const { error: updateError } = await supabase
        .from('yt_videos')
        .upsert(updates, { onConflict: 'video_id' });

      if (updateError) {
        console.error("  [Database Update Error] Failed to update batch:", updateError.message);
      } else {
        totalProcessed += updates.length;
        const percent = totalToProcess > 0 ? ((totalProcessed / totalToProcess) * 100).toFixed(2) : '100.00';
        console.log(`  → Progress: Updated ${totalProcessed} / ${totalToProcess} videos (${percent}%)`);
      }
    }

    // Delay a bit to respect Supabase and YouTube limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Note: since we are updating duration_seconds from NULL to a value, 
    // the next query with `.is('duration_seconds', null)` will automatically fetch the next unprocessed records.
    // So we don't need to increment offset!
    if (videos.length < LIMIT) {
      hasMore = false;
    }
  }

  console.log(`\nSynchronization completed successfully. Total videos updated: ${totalProcessed}`);
}

main().catch(console.error);
