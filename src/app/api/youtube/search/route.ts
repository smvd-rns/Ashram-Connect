import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // Main DB for auth
import { supabaseYt } from "@/lib/supabase-yt"; // YouTube DB for search

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
    
    // --- Privacy Filtering Logic (Cross-DB) ---
    // 1. Get User ID and Role from Main DB
    const authHeader = request.headers.get("Authorization");
    let userId = null;
    let isAdmin = false;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (user && !authError) {
        userId = user.id;
        // Fetch profile with error handling
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, roles')
          .eq('id', userId)
          .single();
        
        if (!profileError && profile) {
          const userRoles = Array.isArray(profile.roles) ? profile.roles : [profile.role].filter(r => r !== null);
          isAdmin = userRoles.includes(1);
        }
      }
    }

    // 2. Determine allowed channel IDs
    let finalChannelIds = channelId ? channelId.split(',') : null;

    if (isAdmin) {
      // For Admins: If no specific filter, get EVERY active channel ID
      if (!finalChannelIds) {
        const { data: allActiveChannels } = await supabase
          .from('youtube_channels')
          .select('channel_id')
          .eq('is_active', true);
        
        finalChannelIds = (allActiveChannels || []).map(c => c.channel_id);
        console.log(`[Search API] Admin searching ALL ${finalChannelIds.length} channels.`);
      }
    } else {
      // For Normal Users/Guests: Get only public or assigned channels
      const { data: allowedChannels, error: rpcError } = await supabase.rpc('get_user_accessible_channels', { 
        requesting_user_id: userId 
      });
      
      if (rpcError) {
        console.error("[Search API] RPC Error fetching accessible channels:", rpcError);
        // Fallback to only public search if RPC fails
        finalChannelIds = null; 
      } else {
        const accessibleIds = (allowedChannels || []).map((c: any) => c.channel_id);
        
        if (finalChannelIds) {
          // Filter requested IDs by what they can actually see
          finalChannelIds = finalChannelIds.filter(id => accessibleIds.includes(id));
        } else {
          finalChannelIds = accessibleIds;
        }
      }
    }

    // 3. Search in YouTube DB
    const { data, error: searchError } = await supabaseYt.rpc("search_youtube_content", {
      query_text: query,
      channel_ids: finalChannelIds, 
      max_limit: limit
    });

    if (searchError) {
      console.error("[Search API] RPC Error:", searchError);
      throw searchError;
    }

    console.log(`[Search API] Results found: ${data?.length || 0}`);

    const results = data || [];
    const playlists = results
      .filter((item: any) => item.type === 'playlist')
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        published: item.published,
        type: item.type,
        playlistCount: item.playlist_count,
        channelTitle: item.channel_title,
        channelId: item.channel_id
      }));

    const videos = results
      .filter((item: any) => item.type === 'video' || item.type === 'playlistItem')
      .map((item: any) => ({
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail,
        published: item.published,
        type: item.type,
        channelTitle: item.channel_title,
        channelId: item.channel_id
      }));

    return NextResponse.json({ 
      playlists,
      videos,
      count: results.length 
    });

  } catch (error: any) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: "Internal Search Error" }, { status: 500 });
  }
}
