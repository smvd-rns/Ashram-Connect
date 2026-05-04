import { createClient } from "@supabase/supabase-js";
import { supabaseYtAdmin as supabaseYt } from "./supabase-yt";

import { safeQuery } from "./resilient-db";


const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const UPSERT_CHUNK_SIZE = 50;
const DEFAULT_FULL_SYNC_PAGES_PER_RUN = 3;

type SyncOptions = {
  startPageToken?: string;
  maxPages?: number;
};

async function readSavedCursor(channelId: string) {
  const { data, error } = await supabase
    .from("youtube_channels")
    .select("sync_cursor")
    .eq("channel_id", channelId)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.sync_cursor || "";
}

async function saveCursorState(channelId: string, cursor: string | null) {
  const { error } = await supabase
    .from("youtube_channels")
    .update({ sync_cursor: cursor, sync_error: null })
    .eq("channel_id", channelId);
  if (error) {
    // Keep sync working even before DB migration is applied.
    const msg = String(error.message || "");
    if (error.code === "42703" || msg.includes("sync_cursor")) {
      console.warn("[YouTube Sync] sync_cursor column missing. Run youtube sync migration to enable persistent resume.");
      return;
    }
    throw error;
  }
}

async function upsertVideosInChunks(videos: any[]) {
  let processed = 0;
  for (let i = 0; i < videos.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = videos.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error: upsertError } = await safeQuery(
      async () =>
        await supabaseYt!
          .from("yt_videos")
          // Avoid expensive updates for already-synced rows.
          .upsert(chunk, { onConflict: "video_id", ignoreDuplicates: true }),
      `Upsert Videos Chunk ${Math.floor(i / UPSERT_CHUNK_SIZE) + 1}`
    );

    if (upsertError) throw upsertError;
    processed += chunk.length;
  }
  return processed;
}

export async function syncYouTubeChannel(channelId: string, isIncremental = false, options: SyncOptions = {}) {
  if (!channelId) throw new Error("Missing channelId");
  if (!YOUTUBE_API_KEY) throw new Error("YouTube API Key missing");

  // 1. Get current sync state from DB
  const { data: channelData, error: fetchErr } = await supabase
    .from("youtube_channels")
    .select("sync_cursor, sync_status, metadata")
    .eq("channel_id", channelId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  // Metadata tracks our multi-stage progress
  const metadata = (channelData?.metadata as any) || { stage: 'uploads', playlistIndex: 0 };
  const currentStage = isIncremental ? 'uploads' : metadata.stage || 'uploads';
  
  console.log(`[YouTube Sync] ${channelId} | Stage: ${currentStage} | Mode: ${isIncremental ? 'Incremental' : 'Full'}`);

  // --- SAFETY STEP: Ensure channel exists in the YouTube DB helper table ---
  const { data: mainChannel } = await supabase.from("youtube_channels").select("name, visibility").eq("channel_id", channelId).single();
  if (mainChannel && supabaseYt) {
    await supabaseYt.from("youtube_channels").upsert({
      channel_id: channelId,
      name: mainChannel.name,
      visibility: mainChannel.visibility
    });
  }

  try {
    // 2. Get "Uploads" playlist ID
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("id", channelId);
    channelUrl.searchParams.set("key", YOUTUBE_API_KEY);
    channelUrl.searchParams.set("part", "contentDetails,statistics");
    const cRes = await fetch(channelUrl.toString());
    const cData = await cRes.json();
    const uploadsId = cData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    const totalReported = parseInt(cData.items?.[0]?.statistics?.videoCount || "0");

    if (!uploadsId) throw new Error("Uploads playlist not found");

    let totalSynced = 0;
    let pagesProcessed = 0;
    const maxPages = isIncremental ? 1 : (options.maxPages || 5);
    let hasMore = true;
    let nextCursor = options.startPageToken || channelData?.sync_cursor || "";

    // --- STAGE: UPLOADS ---
    if (currentStage === 'uploads') {
      do {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsId}&part=snippet,contentDetails&maxResults=50&key=${YOUTUBE_API_KEY}&pageToken=${nextCursor}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "YT API Error");

        const videos = (data.items || []).map((v: any) => ({
          video_id: v.contentDetails.videoId,
          channel_id: channelId,
          title: v.snippet.title,
          description: v.snippet.description,
          thumbnail_url: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url,
          published_at: v.contentDetails.videoPublishedAt || v.snippet.publishedAt,
          kind: 'video',
          updated_at: new Date().toISOString()
        })).filter((v: any) => v.video_id);

        if (videos.length > 0) totalSynced += await upsertVideosInChunks(videos);
        pagesProcessed++;
        nextCursor = data.nextPageToken || "";
        if (pagesProcessed >= maxPages) break;
      } while (nextCursor);

      hasMore = Boolean(nextCursor);
      
      // If uploads finished, move to Playlists stage
      if (!hasMore && !isIncremental) {
        metadata.stage = 'playlists';
        metadata.playlistIndex = 0;
        nextCursor = ""; // Reset cursor for first playlist
      }
    } 
    // --- STAGE: PLAYLISTS ---
    else if (currentStage === 'playlists') {
      const pRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?channelId=${channelId}&part=id,snippet&maxResults=50&key=${YOUTUBE_API_KEY}`);
      const pData = await pRes.json();
      const playlists = pData.items || [];
      const idx = metadata.playlistIndex || 0;

      if (idx < playlists.length) {
        const pl = playlists[idx];
        console.log(`[Deep Sync] Scanning playlist ${idx + 1}/${playlists.length}: ${pl.snippet.title}`);
        
        do {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${pl.id}&part=snippet,contentDetails&maxResults=50&key=${YOUTUBE_API_KEY}&pageToken=${nextCursor}`);
          const data = await res.json();
          if (!res.ok) break;

          const videos = (data.items || []).map((v: any) => ({
            video_id: v.contentDetails.videoId,
            channel_id: channelId,
            title: v.snippet.title,
            published_at: v.contentDetails.videoPublishedAt || v.snippet.publishedAt,
            kind: 'video', updated_at: new Date().toISOString()
          })).filter((v: any) => v.video_id);

          if (videos.length > 0) totalSynced += await upsertVideosInChunks(videos);
          pagesProcessed++;
          nextCursor = data.nextPageToken || "";
          if (pagesProcessed >= maxPages) break;
        } while (nextCursor);

        hasMore = true; // Always more until all playlists are done
        if (!nextCursor) {
          metadata.playlistIndex = idx + 1;
          if (metadata.playlistIndex >= playlists.length) hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // 4. Update State
    const isActuallyDone = !hasMore || isIncremental;
    const updatePayload: any = {
      sync_cursor: hasMore ? nextCursor : null,
      metadata: metadata,
      sync_error: null
    };

    // Only mark as 'completed' and update timestamp if we aren't currently in a Deep Background Sync
    // This prevents a quick incremental sync from clearing the 'syncing' status of a deep scan.
    if (isActuallyDone && channelData?.sync_status !== 'syncing') {
      updatePayload.sync_status = 'completed';
      updatePayload.last_sync_at = new Date().toISOString();
    }

    await supabase.from("youtube_channels").update(updatePayload).eq("channel_id", channelId);

    return { success: true, totalSynced, hasMore, nextPageToken: nextCursor, pagesProcessed };

  } catch (error: any) {
    console.error(`[Sync Error] ${channelId}:`, error);
    await supabase.from("youtube_channels").update({ sync_status: 'error', sync_error: error.message }).eq("channel_id", channelId);
    throw error;
  }
}

