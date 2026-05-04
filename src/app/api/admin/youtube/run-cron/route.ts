import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncYouTubeChannel } from "@/lib/youtube-sync";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Session & Role
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role, roles").eq("id", user.id).single();
    const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role].filter(r => r !== null);
    if (!roles.includes(1)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Fetch all active channels
    const { data: channels, error: fetchError } = await supabase
      .from("youtube_channels")
      .select("channel_id, name, sync_status")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    console.log(`[Manual Cron Trigger] Starting automated sync for ${channels?.length || 0} channels`);
    const results = [];

    // 3. Perform syncs SEQUENTIALLY
    for (const channel of (channels || [])) {
      if (channel.sync_status === 'syncing') {
        results.push({ channel: channel.name, success: true, skipped: true, reason: "Deep Sync Active" });
        continue;
      }

      try {
        const result = await syncYouTubeChannel(channel.channel_id, true);
        results.push({ channel: channel.name, success: true, videos: result.totalSynced });
      } catch (err: any) {
        results.push({ channel: channel.name, success: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
