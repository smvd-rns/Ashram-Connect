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
      .select("video_id, last_position, duration")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (favError) throw favError;

    const favoriteIds = favorites.map(f => f.video_id);
    const progressMap = new Map(favorites.map(f => [f.video_id, { 
      last_position: f.last_position, 
      duration: f.duration 
    }]));

    // Fetch metadata from yt_videos if available
    const { data: videos, error: vidError } = await supabaseAdmin!
      .from("yt_videos")
      .select("*")
      .in("video_id", favoriteIds);

    if (vidError) throw vidError;

    // Map database results to the VideoItem shape expected by the frontend
    const videoMap = new Map(videos.map(v => {
      const progress = progressMap.get(v.video_id);
      return [v.video_id, {
        id: v.video_id,
        title: v.title,
        thumbnail: v.thumbnail_url || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
        date: v.published_at ? new Date(v.published_at).toLocaleDateString() : "",
        published: v.published_at || v.created_at,
        type: v.kind || "video",
        channelId: v.channel_id,
        lastPosition: progress?.last_position || 0,
        duration: progress?.duration || 0
      }];
    }));

    // Sort to match the order of favorites (most recent first)
    const sortedVideos = favoriteIds.map(id => videoMap.get(id)).filter(Boolean);

    return NextResponse.json({ items: sortedVideos, favoriteIds });
  } catch (error: any) {
    console.error("Fetch Watch Later error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Toggle Watch Later status or update progress
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

    const { video_id, last_position, duration, is_update_only } = await request.json();
    if (!video_id) {
      return NextResponse.json({ error: "video_id is required" }, { status: 400 });
    }

    // Check if already in Watch Later
    const { data: existing } = await supabaseAdmin!
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("video_id", video_id)
      .single();

    if (existing) {
      if (last_position !== undefined) {
        // Update progress ONLY if it already exists in Watch Later
        const { error: updError } = await supabaseAdmin!
          .from("user_favorites")
          .update({
            last_position: last_position,
            duration: duration || 0,
            last_watched_at: new Date().toISOString()
          })
          .eq("id", existing.id);
        
        if (updError) throw updError;
        return NextResponse.json({ action: "updated", video_id, last_position });
      } else if (!is_update_only) {
        // Simple Toggle: Remove
        const { error: delError } = await supabaseAdmin!
          .from("user_favorites")
          .delete()
          .eq("id", existing.id);
        
        if (delError) throw delError;
        return NextResponse.json({ action: "removed", video_id });
      }
      return NextResponse.json({ action: "none", video_id });
    } else {
      if (is_update_only) {
        // Don't add to Watch Later if it's just a progress update and not already there
        // This follows the "save only when clicked and watched" rule
        return NextResponse.json({ action: "ignored", video_id });
      }
      // Add
      const { error: insError } = await supabaseAdmin!
        .from("user_favorites")
        .insert({
          user_id: user.id,
          video_id: video_id,
          last_position: last_position || 0,
          duration: duration || 0
        });
      
      if (insError) throw insError;
      return NextResponse.json({ action: "added", video_id });
    }
  } catch (error: any) {
    console.error("Watch Later update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
