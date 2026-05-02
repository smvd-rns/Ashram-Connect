import { createClient } from "@supabase/supabase-js";
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
        await supabase
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

  console.log(`[YouTube Sync] Starting sync for channel ${channelId} (Mode: ${isIncremental ? 'Incremental' : 'Full'})`);

  // 1. Update status to 'syncing'
  await safeQuery(async () => await supabase
    .from("youtube_channels")
    .update({ sync_status: 'syncing', sync_error: null })
    .eq("channel_id", channelId), "Update Sync Status Start");



  try {
    // 2. Get the "Uploads" playlist ID
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("id", channelId);
    channelUrl.searchParams.set("key", YOUTUBE_API_KEY);
    channelUrl.searchParams.set("part", "contentDetails,statistics");
    
    const cRes = await fetch(channelUrl.toString());
    const cData = await cRes.json();
    const channelItem = cData.items?.[0];
    const uploadsId = channelItem?.contentDetails?.relatedPlaylists?.uploads;
    const totalVideosOnYoutube = parseInt(channelItem?.statistics?.videoCount || "0");

    console.log(`[YouTube Sync] Channel Statistics: ${totalVideosOnYoutube} total videos reported by YouTube.`);

    if (!uploadsId) {
      throw new Error(`Could not find uploads playlist for channel ${channelId}`);
    }

    // 3. Paginate through videos in the uploads playlist
    const resolvedStartCursor = typeof options.startPageToken === "string"
      ? options.startPageToken
      : (isIncremental ? "" : await readSavedCursor(channelId));
    let nextPageToken = resolvedStartCursor || "";
    let totalSynced = 0;
    let pagesProcessed = 0;
    const maxPagesThisRun = isIncremental ? 1 : Math.max(1, options.maxPages || DEFAULT_FULL_SYNC_PAGES_PER_RUN);

    do {
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("playlistId", uploadsId);
      itemsUrl.searchParams.set("part", "snippet,contentDetails");
      itemsUrl.searchParams.set("maxResults", "50");
      itemsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      if (nextPageToken) itemsUrl.searchParams.set("pageToken", nextPageToken);

      const itemsRes = await fetch(itemsUrl.toString());
      const itemsData = await itemsRes.json();

      if (!itemsRes.ok) {
        throw new Error(`YouTube API Error: ${itemsData.error?.message || 'Unknown error'}`);
      }

      const videos = (itemsData.items || [])
        .map((item: any) => ({
          video_id: item?.contentDetails?.videoId || "",
          channel_id: channelId,
          title: item?.snippet?.title || "Untitled",
          description: item?.snippet?.description || "",
          thumbnail_url: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || null,
          published_at: item?.contentDetails?.videoPublishedAt || item?.snippet?.publishedAt || null,
          kind: 'video',
          updated_at: new Date().toISOString()
        }))
        .filter((video: any) => Boolean(video.video_id));

      if (videos.length > 0) {
        totalSynced += await upsertVideosInChunks(videos);
      }
      pagesProcessed += 1;

      nextPageToken = itemsData.nextPageToken || "";
      if (pagesProcessed >= maxPagesThisRun) break;
    } while (nextPageToken);

    const hasMore = Boolean(nextPageToken);
    
    // Only update the persistent backfill cursor if we are actually doing a backfill run.
    if (!isIncremental) {
      await saveCursorState(channelId, hasMore ? nextPageToken : null);
    }

    // 4. Fetch and Sync Playlists (Only if NOT incremental)
    if (!isIncremental && !hasMore) {
      const playlistsUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
      playlistsUrl.searchParams.set("channelId", channelId);
      playlistsUrl.searchParams.set("part", "snippet,contentDetails");
      playlistsUrl.searchParams.set("maxResults", "50");
      playlistsUrl.searchParams.set("key", YOUTUBE_API_KEY);

      const pRes = await fetch(playlistsUrl.toString());
      const pData = await pRes.json();

      if (pRes.ok && pData.items) {
        const playlists = pData.items.map((item: any) => ({
          playlist_id: item.id,
          channel_id: channelId,
          title: item.snippet.title,
          thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
          video_count: item.contentDetails.itemCount,
          updated_at: new Date().toISOString()
        }));

        if (playlists.length > 0) {
          const { error: pUpsertError } = await safeQuery(async () => await supabase
            .from("yt_playlists")
            .upsert(playlists, { onConflict: "playlist_id" }), "Upsert Playlists");

          if (pUpsertError) console.error("Playlist upsert error:", pUpsertError);

          // Deep Sync: Process videos within each playlist to find ones missing from the main uploads list
          console.log(`[YouTube Sync] Deep Scanning ${playlists.length} playlists for additional videos...`);
          for (const pl of playlists) {
            let plPageToken = "";
            let plVideosSynced = 0;
            do {
              const plItemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
              plItemsUrl.searchParams.set("playlistId", pl.playlist_id);
              plItemsUrl.searchParams.set("part", "snippet,contentDetails");
              plItemsUrl.searchParams.set("maxResults", "50");
              plItemsUrl.searchParams.set("key", YOUTUBE_API_KEY);
              if (plPageToken) plItemsUrl.searchParams.set("pageToken", plPageToken);

              const plRes = await fetch(plItemsUrl.toString());
              const plData = await plRes.json();

              if (plRes.ok && plData.items) {
                const plVideos = plData.items.map((item: any) => ({
                  video_id: item?.contentDetails?.videoId || "",
                  channel_id: channelId,
                  title: item?.snippet?.title || "Untitled",
                  description: item?.snippet?.description || "",
                  thumbnail_url: item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.medium?.url,
                  published_at: item?.contentDetails?.videoPublishedAt || item?.snippet?.publishedAt,
                  kind: 'video',
                  updated_at: new Date().toISOString()
                })).filter((v: any) => v.video_id);

                if (plVideos.length > 0) {
                  plVideosSynced += await upsertVideosInChunks(plVideos);
                }
                plPageToken = plData.nextPageToken || "";
              } else {
                plPageToken = "";
              }
            } while (plPageToken);
            console.log(`[YouTube Sync] Playlist ${pl.title}: Synced ${plVideosSynced} videos.`);
          }
        }

      }
    }

    // 5. Finalize status: Completed if we finished the whole thing, 
    // OR if we finished the requested incremental pass.
    if (!hasMore || isIncremental) {
      await safeQuery(async () => await supabase
        .from("youtube_channels")
        .update({
          sync_status: 'completed',
          last_sync_at: new Date().toISOString(),
          sync_error: null,
          // Only clear cursor if we actually reached the end of the playlist.
          ...(!hasMore ? { sync_cursor: null } : {})
        })
        .eq("channel_id", channelId), "Update Sync Status Success");
    }



    return { success: true, totalSynced, hasMore, nextPageToken, pagesProcessed };
  } catch (error: any) {
    console.error(`[YouTube Sync Error] Channel ${channelId}:`, error);
    
    // Update status to error
    await safeQuery(async () => await supabase
      .from("youtube_channels")
      .update({ sync_status: 'error', sync_error: error.message })
      .eq("channel_id", channelId), "Update Sync Status Error");



    throw error;
  }
}
