import { NextRequest, NextResponse } from "next/server";
import { syncYouTubeChannelFull } from "@/lib/youtube-sync-full";

// Track running jobs in-memory (per server instance)
const runningJobs = new Set<string>();

export async function POST(request: NextRequest) {
  try {
    const { channelId } = await request.json();
    if (!channelId) return NextResponse.json({ error: "Missing channelId" }, { status: 400 });

    if (runningJobs.has(channelId)) {
      return NextResponse.json({ status: "already_running", channelId });
    }

    // Fire-and-forget: start sync in background, respond immediately
    runningJobs.add(channelId);
    syncYouTubeChannelFull(channelId).finally(() => {
      runningJobs.delete(channelId);
    });

    return NextResponse.json({ 
      status: "started", 
      channelId,
      message: "Background sync started. Poll /api/admin/youtube/sync-status for progress."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const channelId = request.nextUrl.searchParams.get("channelId");
  return NextResponse.json({ 
    running: channelId ? runningJobs.has(channelId) : false,
    allRunning: Array.from(runningJobs)
  });
}
