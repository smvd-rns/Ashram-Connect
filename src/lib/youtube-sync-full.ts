import { createClient } from "@supabase/supabase-js";
import { supabaseYtAdmin as supabaseYt } from "./supabase-yt";


const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CHUNK_SIZE = 100;

function isShortVideo(title?: string, description?: string): boolean {
  const t = (title || "").toLowerCase();
  const d = (description || "").toLowerCase();
  return t.includes("#shorts") || d.includes("#shorts") || t.includes("#short") || d.includes("#short") || t.includes("#reels") || d.includes("#reels");
}

function parseISO8601Duration(durationStr: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = (durationStr || "").match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || "0", 10);
  const minutes = parseInt(matches[2] || "0", 10);
  const seconds = parseInt(matches[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchVideoDurations(videoIds: string[]): Promise<Record<string, number>> {
  const durations: Record<string, number> = {};
  if (videoIds.length === 0) return durations;
  
  for (let j = 0; j < videoIds.length; j += 50) {
    const batch = videoIds.slice(j, j + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(",")}&key=${YOUTUBE_API_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.items) {
        for (const item of data.items) {
          if (item.contentDetails?.duration) {
            durations[item.id] = parseISO8601Duration(item.contentDetails.duration);
          }
        }
      }
    } catch (err) {
      console.error("[BgSync] Failed to fetch video durations:", err);
    }
  }
  return durations;
}

async function upsertChunked(videos: any[]) {
  let count = 0;
  for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
    const chunk = videos.slice(i, i + CHUNK_SIZE);
    
    // Fetch durations
    const videoIds = chunk.map(v => v.video_id);
    const durations = await fetchVideoDurations(videoIds);
    
    // Enrich videos
    const enrichedChunk = chunk.map(v => {
      const duration = durations[v.video_id] !== undefined ? durations[v.video_id] : null;
      
      // Exclude UCZ8S3qwowiFztAQBRTawWfA (Hare Krishna TV)
      const isHkTV = v.channel_id === 'UCZ8S3qwowiFztAQBRTawWfA';
      
      const isShort = !isHkTV && (duration !== null 
        ? duration <= 180 
        : v.is_short);

      return {
        ...v,
        duration_seconds: duration,
        is_short: isShort
      };
    });

    const { error } = await supabaseYt!
      .from("yt_videos")
      .upsert(enrichedChunk, { onConflict: "video_id", ignoreDuplicates: true });
    if (error) console.error("[BgSync] Upsert error:", error.message);
    else count += enrichedChunk.length;
  }
  return count;
}

async function fetchAllPlaylistVideos(playlistId: string, channelId: string): Promise<number> {
  let pageToken = "";
  let total = 0;
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet,contentDetails&maxResults=50&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.error("[BgSync] Playlist fetch error:", data.error?.message);
      break;
    }
    const videos = (data.items || []).map((v: any) => ({
      video_id: v.contentDetails?.videoId,
      channel_id: channelId,
      title: v.snippet?.title || "Untitled",
      description: v.snippet?.description || "",
      thumbnail_url: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || null,
      published_at: v.contentDetails?.videoPublishedAt || v.snippet?.publishedAt || null,
      kind: "video",
      is_short: isShortVideo(v.snippet?.title, v.snippet?.description),
      updated_at: new Date().toISOString(),
    })).filter((v: any) => !!v.video_id);

    if (videos.length > 0) total += await upsertChunked(videos);
    pageToken = data.nextPageToken || "";
    
    // Throttling: Add a small delay to prevent exhausting Supabase Disk IO budget
    if (pageToken) await new Promise(resolve => setTimeout(resolve, 500));
  } while (pageToken);
  return total;
}

export async function syncYouTubeChannelFull(channelId: string) {
  console.log(`[BgSync] ===== Starting Full Background Sync for ${channelId} =====`);

  // --- SAFETY STEP: Ensure channel exists in the YouTube DB helper table ---
  const { data: mainChannel } = await supabase.from("youtube_channels").select("name, visibility").eq("channel_id", channelId).single();
  if (mainChannel && supabaseYt) {
    await supabaseYt.from("youtube_channels").upsert({
      channel_id: channelId,
      name: mainChannel.name,
      visibility: mainChannel.visibility
    });
  }

  const engine = process.env.SYNC_ENGINE_NAME || 'local';

  await supabase.from("youtube_channels").update({
    sync_status: "syncing",
    sync_error: null,
    metadata: { stage: "uploads", startedAt: new Date().toISOString(), engine }
  }).eq("channel_id", channelId);

  try {
    // --- STEP 1: Get channel details ---
    const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=contentDetails,statistics&key=${YOUTUBE_API_KEY}`);
    const cData = await cRes.json();
    const uploadsPlaylistId = cData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    const totalOnYT = cData.items?.[0]?.statistics?.videoCount || "?";

    if (!uploadsPlaylistId) throw new Error("Could not find uploads playlist");
    console.log(`[BgSync] Channel has ~${totalOnYT} videos on YouTube. Starting main uploads sync...`);

    // --- STEP 2: Sync main Uploads playlist (all pages, no limit) ---
    let uploadsTotal = 0;
    await supabase.from("youtube_channels").update({ metadata: { stage: "uploads", totalOnYT, engine } }).eq("channel_id", channelId);
    uploadsTotal = await fetchAllPlaylistVideos(uploadsPlaylistId, channelId);
    console.log(`[BgSync] Uploads stage done. Synced ${uploadsTotal} videos.`);

    // --- STEP 3: Get all channel playlists ---
    console.log(`[BgSync] Starting deep playlist scan...`);
    await supabase.from("youtube_channels").update({ metadata: { stage: "deep_scan", uploadsTotal, totalOnYT, engine } }).eq("channel_id", channelId);

    let allPlaylists: any[] = [];
    let plPageToken = "";
    do {
      const pRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?channelId=${channelId}&part=id,snippet,contentDetails&maxResults=50&key=${YOUTUBE_API_KEY}${plPageToken ? `&pageToken=${plPageToken}` : ""}`);
      const pData = await pRes.json();
      if (pRes.ok && pData.items) allPlaylists.push(...pData.items);
      plPageToken = pData.nextPageToken || "";
    } while (plPageToken);

    console.log(`[BgSync] Found ${allPlaylists.length} playlists. Scanning each...`);

    // Upsert playlist records
    const playlistRecords = allPlaylists.map((pl: any) => ({
      playlist_id: pl.id,
      channel_id: channelId,
      title: pl.snippet?.title,
      thumbnail_url: pl.snippet?.thumbnails?.high?.url || pl.snippet?.thumbnails?.medium?.url,
      video_count: pl.contentDetails?.itemCount,
      updated_at: new Date().toISOString()
    }));
    if (playlistRecords.length > 0) {
      await supabaseYt!.from("yt_playlists").upsert(playlistRecords, { onConflict: "playlist_id" });
    }

    // --- STEP 4: Sync each playlist ---
    let deepTotal = 0;
    for (let i = 0; i < allPlaylists.length; i++) {
      const pl = allPlaylists[i];
      const count = await fetchAllPlaylistVideos(pl.id, channelId);
      deepTotal += count;
      console.log(`[BgSync] Playlist ${i + 1}/${allPlaylists.length} "${pl.snippet?.title}": +${count} videos (total new: ${deepTotal})`);
      
      // Update progress in DB so admin can see it - ONLY every 10 playlists to save Disk IO budget
      if (i % 10 === 0 || i === allPlaylists.length - 1) {
        await supabase.from("youtube_channels").update({
          metadata: { 
            stage: "deep_scan", 
            playlistProgress: `${i + 1}/${allPlaylists.length}`,
            deepTotal,
            uploadsTotal,
            totalOnYT,
            engine
          }
        }).eq("channel_id", channelId);
      }
    }

    // --- STEP 5: Mark completed ---
    const grandTotal = uploadsTotal + deepTotal;
    console.log(`[BgSync] ===== COMPLETE! Total synced: ${grandTotal} videos =====`);
    await supabase.from("youtube_channels").update({
      sync_status: "completed",
      last_sync_at: new Date().toISOString(),
      sync_cursor: null,
      sync_error: null,
      metadata: { stage: "completed", grandTotal, uploadsTotal, deepTotal, totalOnYT, engine }
    }).eq("channel_id", channelId);

  } catch (err: any) {
    console.error(`[BgSync] FATAL ERROR for ${channelId}:`, err.message);
    await supabase.from("youtube_channels").update({
      sync_status: "error",
      sync_error: err.message
    }).eq("channel_id", channelId);
  }
}
