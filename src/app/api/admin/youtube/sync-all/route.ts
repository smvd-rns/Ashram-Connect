import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// This is the endpoint called by Vercel Cron
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Security check: Verify the Cron Secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 1. Fetch all channels that need syncing
    const { data: channels, error: fetchError } = await supabase
      .from("youtube_channels")
      .select("channel_id, name");

    if (fetchError) throw fetchError;

    console.log(`[Sync All] Starting automation for ${channels?.length || 0} channels`);

    const results = [];
    const baseUrl = new URL(request.url).origin;

    // 2. Trigger an incremental sync for each channel
    // We do them one by one to avoid hitting rate limits or timeouts too quickly
    for (const channel of (channels || [])) {
      try {
        const syncRes = await fetch(`${baseUrl}/api/admin/youtube/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            channelId: channel.channel_id, 
            isIncremental: true 
          })
        });
        
        const syncData = await syncRes.json();
        results.push({
          channel: channel.name,
          success: syncRes.ok,
          videosSynced: syncData.totalSynced || 0,
          error: syncData.error || null
        });
      } catch (err: any) {
        results.push({
          channel: channel.name,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: results
    });

  } catch (error: any) {
    console.error("[Sync All Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
