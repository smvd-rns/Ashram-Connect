import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const channelId = searchParams.get("channelId");
  const limit = parseInt(searchParams.get("limit") || "200");

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  try {
    console.log(`[Search API] Querying: "${query}" (Channel Filters: ${channelId || "all"})`);
    
    // Split comma-separated IDs into an array for the multi-channel RPC
    const channelIds = channelId ? channelId.split(',') : null;

    // Get User ID from Session for Privacy Filtering
    const authHeader = request.headers.get("Authorization");
    let userId = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    const { data, error: searchError } = await supabase.rpc("search_youtube_content", {
      query_text: query,
      channel_ids: channelIds,
      max_limit: limit,
      requesting_user_id: userId
    });

    if (searchError) {
      console.error("[Search API] RPC Error:", searchError);
      throw searchError;
    }

    console.log(`[Search API] Results found: ${data?.length || 0}`);

    const results = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      published: item.published,
      type: item.type,
      playlistCount: item.playlist_count,
      channelTitle: item.channel_title,
      channelId: item.channel_id
    }));

    return NextResponse.json({ 
      items: results,
      count: results.length 
    });

  } catch (error: any) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: "Internal Search Error" }, { status: 500 });
  }
}
