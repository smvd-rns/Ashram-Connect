import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { channelId, isIncremental = false } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YouTube API Key missing" }, { status: 503 });
    }

    // 1. Update status to 'syncing'
    await supabase
      .from("youtube_channels")
      .update({ sync_status: 'syncing', sync_error: null })
      .eq("channel_id", channelId);

    // 2. Get the "Uploads" playlist ID
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("id", channelId);
    channelUrl.searchParams.set("key", YOUTUBE_API_KEY);
    channelUrl.searchParams.set("part", "contentDetails");
    
    const cRes = await fetch(channelUrl.toString());
    const cData = await cRes.json();
    const uploadsId = cData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsId) {
       throw new Error("Could not find uploads playlist for this channel.");
    }

    // 3. Paginate through videos in the uploads playlist
    let nextPageToken = "";
    let totalSynced = 0;

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

      const videos = (itemsData.items || []).map((item: any) => ({
        video_id: item.contentDetails.videoId,
        channel_id: channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        published_at: item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
        kind: 'video', 
        updated_at: new Date().toISOString()
      }));

      if (videos.length > 0) {
        // DUPLICATE PREVENTION: .upsert on video_id handles this safely.
        const { error: upsertError } = await supabase
          .from("yt_videos")
          .upsert(videos, { onConflict: "video_id" });

        if (upsertError) throw upsertError;
        totalSynced += videos.length;
      }

      // If incremental (automation mode), we only fetch the first page (latest 50)
      if (isIncremental) {
        nextPageToken = "";
      } else {
        nextPageToken = itemsData.nextPageToken;
      }
    } while (nextPageToken);

    // 4. Fetch and Sync Playlists (Only if NOT incremental or first time)
    if (!isIncremental) {
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
          const { error: pUpsertError } = await supabase
            .from("yt_playlists")
            .upsert(playlists, { onConflict: "playlist_id" });
          if (pUpsertError) console.error("Playlist upsert error:", pUpsertError);
        }
      }
    }

    // 5. Finalize status
    await supabase
      .from("youtube_channels")
      .update({ 
        sync_status: 'completed', 
        last_sync_at: new Date().toISOString(),
        sync_error: null 
      })
      .eq("channel_id", channelId);

    return NextResponse.json({ success: true, totalSynced, mode: isIncremental ? 'incremental' : 'full' });

  } catch (error: any) {
    console.error("Sync Error:", error);
    
    // Attempt to update status to error
    try {
        const body = await request.clone().json();
        const cid = body.channelId;
        if (cid) {
            await supabase
                .from("youtube_channels")
                .update({ sync_status: 'error', sync_error: error.message })
                .eq("channel_id", cid);
        }
    } catch {}

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
