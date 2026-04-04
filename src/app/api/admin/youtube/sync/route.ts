import { NextRequest, NextResponse } from "next/server";
import { syncYouTubeChannel } from "@/lib/youtube-sync";

export async function POST(request: NextRequest) {
  try {
    const { channelId, isIncremental = false } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const { totalSynced } = await syncYouTubeChannel(channelId, isIncremental);

    return NextResponse.json({ 
      success: true, 
      totalSynced, 
      mode: isIncremental ? 'incremental' : 'full' 
    });

  } catch (error: any) {
    console.error("Manual Sync Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
