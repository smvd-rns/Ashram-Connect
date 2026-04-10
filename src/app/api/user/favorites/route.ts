import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

/**
 * GET: Fetch user's favorite videos
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // VERIFY with a shorter timeout to prevent 10s hangs
    const { data: { user }, error: authError } = await Promise.race([
      supabase.auth.getUser(token),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Connection Timeout")), 5000))
    ]).catch(err => ({ data: { user: null }, error: err }));
    
    if (authError || !user) {
      console.error("Auth Error/Timeout:", authError);
      return NextResponse.json({ 
        error: authError?.message === "Supabase Connection Timeout" 
          ? "Database connection timed out. Please check your internet or Supabase project status." 
          : "Invalid session" 
      }, { status: authError?.message === "Supabase Connection Timeout" ? 504 : 401 });
    }

    // BYPASS RLS: Using supabaseAdmin (Service Role) because RLS auth.uid() 
    // isn't set on server-side requests using the static anon client.
    const { data: favorites, error: favError } = await supabaseAdmin!
      .from("user_favorites")
      .select("video_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (favError) throw favError;

    const favoriteIds = favorites.map(f => f.video_id);

    // Fetch metadata from yt_videos if available
    const { data: videos, error: vidError } = await supabaseAdmin!
      .from("yt_videos")
      .select("*")
      .in("video_id", favoriteIds);

    if (vidError) throw vidError;

    // Map database results to the VideoItem shape expected by the frontend
    const videoMap = new Map(videos.map(v => [v.video_id, {
      id: v.video_id, // Important: Frontend expects YouTube ID in 'id' property
      title: v.title,
      thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
      date: v.published_at ? new Date(v.published_at).toLocaleDateString() : "",
      published: v.published_at || v.created_at,
      type: v.kind || "video",
      channelId: v.channel_id
    }]));

    // Sort to match the order of favorites (most recent first)
    const sortedVideos = favoriteIds.map(id => videoMap.get(id)).filter(Boolean);

    return NextResponse.json({ items: sortedVideos, favoriteIds });
  } catch (error: any) {
    console.error("Fetch favorites error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Toggle favorite status for a video
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { video_id } = await request.json();
    if (!video_id) {
      return NextResponse.json({ error: "video_id is required" }, { status: 400 });
    }

    // Check if already favorited
    const { data: existing } = await supabaseAdmin!
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", video_id)
      .single();

    if (existing) {
      // Remove
      const { error: delError } = await supabaseAdmin!
        .from("user_favorites")
        .delete()
        .eq("id", existing.id);
      
      if (delError) throw delError;
      return NextResponse.json({ action: "removed", video_id });
    } else {
      // Add
      const { error: insError } = await supabaseAdmin!
        .from("user_favorites")
        .insert({
          user_id: user.id,
          video_id: video_id
        });
      
      if (insError) throw insError;
      return NextResponse.json({ action: "added", video_id });
    }
  } catch (error: any) {
    console.error("Toggle favorite error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
