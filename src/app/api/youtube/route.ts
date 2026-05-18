import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseYt } from "@/lib/supabase-yt";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const CACHE_SECONDS = 1800; // 30 minutes

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  published: string;
  type: "video" | "live" | "short";
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? "s" : ""} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");
  const channelId = searchParams.get("channelId");
  const playlistId = searchParams.get("playlistId"); // For entering a playlist
  const type = searchParams.get("type") ?? "videos";
  const pageToken = searchParams.get("pageToken") ?? "";
  const maxResults = Math.min(parseInt(searchParams.get("maxResults") ?? "50"), 50);

  // Handle single video fetch if videoId is provided
  if (videoId) {
    try {
      // 1. Try DB first
      const { data: videoRecord } = await supabaseYt
        .from("yt_videos")
        .select("*")
        .eq("video_id", videoId)
        .maybeSingle();

      if (videoRecord) {
        return NextResponse.json({
          id: videoRecord.video_id,
          title: videoRecord.title,
          thumbnail: videoRecord.thumbnail_url || `https://i.ytimg.com/vi/${videoRecord.video_id}/mqdefault.jpg`,
          date: videoRecord.published_at ? formatRelativeDate(videoRecord.published_at) : "",
          published: videoRecord.published_at ?? "",
          type: videoRecord.kind || "video"
        });
      }

      // 2. Try YouTube API
      if (!YOUTUBE_API_KEY) {
        return NextResponse.json({ error: "API Key missing and video not cached" }, { status: 503 });
      }

      const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      apiUrl.searchParams.set("id", videoId);
      apiUrl.searchParams.set("part", "snippet,contentDetails");
      apiUrl.searchParams.set("key", YOUTUBE_API_KEY);

      const res = await fetch(apiUrl.toString(), { cache: "no-store" });
      const data = await res.json();
      const item = data.items?.[0];

      if (!item) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      const snippet = item.snippet;
      return NextResponse.json({
        id: item.id,
        title: snippet.title,
        thumbnail: snippet.thumbnails?.maxres?.url ?? 
                   snippet.thumbnails?.high?.url ?? 
                   snippet.thumbnails?.medium?.url ?? 
                   `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`,
        date: snippet.publishedAt ? formatRelativeDate(snippet.publishedAt) : "",
        published: snippet.publishedAt ?? "",
        type: "video"
      });
    } catch (err) {
      console.error("Single video fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch video details" }, { status: 500 });
    }
  }

  if (!channelId && !playlistId) {
    return NextResponse.json({ error: "Missing identity parameter" }, { status: 400 });
  }

  let channelTitle = "";
  let channelLogo = "";

  try {
    // Step 1: If we have a channelId, get basic info and check privacy
    if (channelId) {
      // PRIVACY CHECK: Verify if channel is private
      const { data: channelMeta } = await supabase
        .from("youtube_channels")
        .select("id, name, custom_logo, visibility")
        .eq("channel_id", channelId)
        .single();
      
      if (channelMeta) {
        channelTitle = channelMeta.name || "";
        channelLogo = channelMeta.custom_logo || "";

        if (channelMeta.visibility === 'private') {
          const authHeader = request.headers.get("Authorization");
          let hasAccess = false;
          
          if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { data: { user } } = await supabase.auth.getUser(token);
            if (user) {
              const { data: profile } = await supabase.from("profiles").select("role, roles").eq("id", user.id).single();
              const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role].filter(r => r !== null && r !== undefined);
              const isSuperAdmin = roles.includes(1);
              
              if (isSuperAdmin) {
                hasAccess = true;
              } else {
                const { data: assignment } = await supabase
                  .from("youtube_channel_assignments")
                  .select("id")
                  .eq("channel_id", channelMeta.id)
                  .eq("user_id", user.id)
                  .single();
                if (assignment) hasAccess = true;
              }
            }
          }
          
          if (!hasAccess) {
            return NextResponse.json({ error: "Private Channel: Access Restricted" }, { status: 403 });
          }
        }
      }
    }

    // Step 2: Try serving from YouTube Dedicated Database (Supabase) FIRST
    let useDatabase = false;
    let dbItems: any[] = [];
    let nextOffsetToken = "";

    if (!playlistId && channelId) {
      const offset = pageToken ? parseInt(pageToken) || 0 : 0;
      if (type === "playlists") {
        const { data: playlists } = await supabaseYt
          .from("yt_playlists")
          .select("*")
          .eq("channel_id", channelId)
          .order("created_at", { ascending: false })
          .range(offset, offset + maxResults - 1);
        
        if (playlists && playlists.length > 0) {
          useDatabase = true;
          dbItems = playlists.map(pl => ({
            id: pl.playlist_id,
            title: pl.title || "Untitled",
            thumbnail: pl.thumbnail_url || "",
            date: pl.created_at ? formatRelativeDate(pl.created_at) : "",
            published: pl.created_at || "",
            type: "playlist",
            playlistCount: pl.video_count || 0
          }));
          if (playlists.length === maxResults) {
            nextOffsetToken = String(offset + maxResults);
          }
        }
      } else {
        // Videos / Live
        let dbQuery = supabaseYt
          .from("yt_videos")
          .select("*")
          .eq("channel_id", channelId)
          .order("published_at", { ascending: false });

        if (type === "live") {
          dbQuery = dbQuery.eq("kind", "live");
        }

        const { data: dbVideos } = await dbQuery.range(offset, offset + maxResults - 1);
        
        if (dbVideos && dbVideos.length > 0) {
          useDatabase = true;
          dbItems = dbVideos.map(vid => ({
            id: vid.video_id,
            title: vid.title || "Untitled",
            thumbnail: vid.thumbnail_url || `https://i.ytimg.com/vi/${vid.video_id}/mqdefault.jpg`,
            date: vid.published_at ? formatRelativeDate(vid.published_at) : "",
            published: vid.published_at || "",
            type: vid.kind || "video",
            playlistCount: undefined
          }));
          if (dbVideos.length === maxResults) {
            nextOffsetToken = String(offset + maxResults);
          }
        }
      }
    }

    if (useDatabase) {
      console.log(`[YouTube API Route] Serving ${type} from database cache for channel ${channelId}`);
      return NextResponse.json(
        {
          items: dbItems,
          nextPageToken: nextOffsetToken,
          channelTitle,
          channelLogo,
        },
        { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60` } }
      );
    }

    // Step 3: Google YouTube API Fallback (for unsynced channels or specific playlists)
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "API Key missing and content not cached" }, { status: 503 });
    }

    let apiUrl: URL;

    if (playlistId) {
      apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      apiUrl.searchParams.set("playlistId", playlistId);
      apiUrl.searchParams.set("part", "snippet");
    } else if (type === "playlists") {
      apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlists");
      apiUrl.searchParams.set("channelId", channelId!);
      apiUrl.searchParams.set("part", "snippet,contentDetails");
    } else {
      // DEFAULT: Use the uploads playlist for Videos/Live
      const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
      channelUrl.searchParams.set("id", channelId!);
      channelUrl.searchParams.set("key", YOUTUBE_API_KEY!);
      channelUrl.searchParams.set("part", "contentDetails");
      const cRes = await fetch(channelUrl.toString());
      const cData = await cRes.json();
      
      if (!cRes.ok) {
        throw new Error(cData.error?.message || "Failed to fetch uploads playlist ID from YouTube");
      }
      
      const uploadsId = cData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) {
        return NextResponse.json({ error: "Uploads playlist not found for channel" }, { status: 404 });
      }

      apiUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      apiUrl.searchParams.set("playlistId", uploadsId);
      apiUrl.searchParams.set("part", "snippet");
    }

    apiUrl.searchParams.set("key", YOUTUBE_API_KEY);
    apiUrl.searchParams.set("maxResults", String(maxResults));
    if (pageToken) apiUrl.searchParams.set("pageToken", pageToken);

    const response = await fetch(apiUrl.toString(), { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      // If YouTube API fails for a playlist, fall back to channel's videos in database
      console.warn(`[YouTube API Route] YouTube API failed with status ${response.status}. Falling back to database.`);
      
      if (channelId) {
        const offset = pageToken ? parseInt(pageToken) || 0 : 0;
        const { data: dbVideos } = await supabaseYt
          .from("yt_videos")
          .select("*")
          .eq("channel_id", channelId)
          .order("published_at", { ascending: false })
          .range(offset, offset + maxResults - 1);
        
        if (dbVideos && dbVideos.length > 0) {
          const fallbackItems = dbVideos.map(vid => ({
            id: vid.video_id,
            title: vid.title || "Untitled",
            thumbnail: vid.thumbnail_url || `https://i.ytimg.com/vi/${vid.video_id}/mqdefault.jpg`,
            date: vid.published_at ? formatRelativeDate(vid.published_at) : "",
            published: vid.published_at || "",
            type: vid.kind || "video",
            playlistCount: undefined
          }));
          let nextOffsetToken = "";
          if (dbVideos.length === maxResults) nextOffsetToken = String(offset + maxResults);
          
          return NextResponse.json({
            items: fallbackItems,
            nextPageToken: nextOffsetToken,
            channelTitle,
            channelLogo
          });
        }
      }
      
      return NextResponse.json({ error: "Fetch Error", details: data }, { status: 502 });
    }

    const mappedItems = (data.items ?? [])
      .map((item: any) => {
        const snippet = item.snippet;
        if (!snippet) return null;

        const title = snippet.title ?? "";
        if (title === "Private video" || title === "Deleted video") return null;

        const isPlaylistItems = !!playlistId;
        const isPlaylistTab = type === "playlists" && !isPlaylistItems;

        let id = "";
        if (isPlaylistTab) {
          id = item.id;
        } else if (isPlaylistItems) {
          id = item.contentDetails?.videoId ?? snippet.resourceId?.videoId ?? (typeof item.id === 'string' ? item.id : item.id?.videoId);
        } else {
          id = item.id?.videoId ?? snippet.resourceId?.videoId ?? (typeof item.id === 'string' ? item.id : item.id?.videoId);
        }

        if (!id) return null;

        const isLiveNow = snippet.liveBroadcastContent === "live" || snippet.liveBroadcastContent === "completed";
        if (type === "live" && !isLiveNow) return null;

        return {
          id,
          title: title || "Untitled",
          thumbnail: snippet.thumbnails?.maxres?.url ??
            snippet.thumbnails?.high?.url ??
            snippet.thumbnails?.medium?.url ??
            `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          date: snippet.publishedAt ? formatRelativeDate(snippet.publishedAt) : "",
          published: snippet.publishedAt ?? "",
          type: isPlaylistTab ? "playlist" : (isLiveNow ? "live" : "video"),
          playlistCount: item.contentDetails?.itemCount,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        items: mappedItems,
        nextPageToken: data.nextPageToken ?? "",
        channelTitle,
        channelLogo,
      },
      { headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60` } }
    );
  } catch (error: any) {
    console.error("API error:", error);
    // Ultimate fallback: Try to serve whatever we can from database
    try {
      if (channelId) {
        const offset = pageToken ? parseInt(pageToken) || 0 : 0;
        let fallbackItems: any[] = [];
        let nextOffsetToken = "";

        if (type === "playlists") {
          const { data: playlists } = await supabaseYt
            .from("yt_playlists")
            .select("*")
            .eq("channel_id", channelId)
            .order("created_at", { ascending: false })
            .range(offset, offset + maxResults - 1);
          if (playlists) {
            fallbackItems = playlists.map(pl => ({
              id: pl.playlist_id,
              title: pl.title || "Untitled",
              thumbnail: pl.thumbnail_url || "",
              date: pl.created_at ? formatRelativeDate(pl.created_at) : "",
              published: pl.created_at || "",
              type: "playlist",
              playlistCount: pl.video_count || 0
            }));
            if (playlists.length === maxResults) nextOffsetToken = String(offset + maxResults);
          }
        } else {
          const { data: dbVideos } = await supabaseYt
            .from("yt_videos")
            .select("*")
            .eq("channel_id", channelId)
            .order("published_at", { ascending: false })
            .range(offset, offset + maxResults - 1);
          if (dbVideos) {
            fallbackItems = dbVideos.map(vid => ({
              id: vid.video_id,
              title: vid.title || "Untitled",
              thumbnail: vid.thumbnail_url || `https://i.ytimg.com/vi/${vid.video_id}/mqdefault.jpg`,
              date: vid.published_at ? formatRelativeDate(vid.published_at) : "",
              published: vid.published_at || "",
              type: vid.kind || "video",
              playlistCount: undefined
            }));
            if (dbVideos.length === maxResults) nextOffsetToken = String(offset + maxResults);
          }
        }

        return NextResponse.json({
          items: fallbackItems,
          nextPageToken: nextOffsetToken,
          channelTitle,
          channelLogo
        });
      }
    } catch (dbErr) {
      console.error("Double failure in fallback:", dbErr);
    }
    
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
