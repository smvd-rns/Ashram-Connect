import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const channelId = searchParams.get("channelId");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  try {
    console.log(`[Search API] Querying: "${query}" (Channel Filter: ${channelId || "none"})`);
    
    const { data, error: searchError } = await supabase.rpc("search_youtube_content", {
      query_text: query,
      channel_id_filter: channelId || null,
      max_limit: limit
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
