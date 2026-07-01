import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // Main DB for auth
import { supabaseYt } from "@/lib/supabase-yt"; // YouTube DB for queries

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 50);

  try {
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
    let finalChannelIds: string[] | null = null;

    if (isAdmin) {
      // Admins search all active channels
      const { data: allActiveChannels } = await supabase
        .from('youtube_channels')
        .select('channel_id')
        .eq('is_active', true);
      
      finalChannelIds = (allActiveChannels || []).map(c => c.channel_id);
    } else {
      // Normal user: restrict to accessible channels only
      const { data: allowedChannels, error: rpcError } = await supabase.rpc('get_user_accessible_channels', { 
        requesting_user_id: userId 
      });
      
      if (rpcError) {
        console.error("[Shorts API] RPC Error fetching accessible channels:", rpcError);
        finalChannelIds = null;
      } else {
        const accessibleIds = (allowedChannels || []).map((c: any) => c.channel_id);
        finalChannelIds = accessibleIds.length > 0 ? accessibleIds : null;
      }
    }

    if (finalChannelIds && finalChannelIds.length === 0) {
      finalChannelIds = null;
    }

    const targetChannelId = searchParams.get("channelId");
    if (targetChannelId) {
      if (finalChannelIds && !finalChannelIds.includes(targetChannelId)) {
        // Not authorized to view this channel
        return NextResponse.json({ items: [] });
      }
      finalChannelIds = [targetChannelId];
    }

    // 3. Query random shorts in YouTube DB via RPC
    const { data: shorts, error: shortsError } = await supabaseYt.rpc("get_random_shorts", {
      channel_ids: finalChannelIds, 
      max_limit: limit
    });

    if (shortsError) {
      console.error("[Shorts API] RPC Error:", shortsError);
      throw shortsError;
    }

    return NextResponse.json({ items: shorts || [] });
  } catch (err) {
    console.error("Shorts fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch shorts" }, { status: 500 });
  }
}
