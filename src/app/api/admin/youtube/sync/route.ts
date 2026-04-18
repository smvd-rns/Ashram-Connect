import { NextRequest, NextResponse } from "next/server";
import { syncYouTubeChannel } from "@/lib/youtube-sync";

function isStatementTimeoutError(error: any) {
  return error?.code === "57014" || String(error?.message || "").toLowerCase().includes("statement timeout");
}

export async function POST(request: NextRequest) {
  try {
    const { channelId, isIncremental = false, cursor, maxPages } = await request.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    try {
      const { totalSynced, hasMore, nextPageToken, pagesProcessed } = await syncYouTubeChannel(channelId, isIncremental, {
        startPageToken: typeof cursor === "string" ? cursor : undefined,
        maxPages: typeof maxPages === "number" ? maxPages : undefined
      });
      return NextResponse.json({
        success: true,
        totalSynced,
        mode: isIncremental ? "incremental" : "full",
        hasMore,
        nextCursor: nextPageToken || null,
        pagesProcessed
      });
    } catch (error: any) {
      // Full sync can exceed DB statement timeout on large channels.
      if (!isIncremental && isStatementTimeoutError(error)) {
        // Cursor-based backfill should retry on the same cursor, not fall back
        // to incremental (which only touches latest videos).
        if (cursor || typeof maxPages === "number") {
          return NextResponse.json({
            success: false,
            retryable: true,
            cursor: cursor || null,
            error: "Backfill page timed out. Retry from the same cursor."
          }, { status: 504 });
        }

        console.warn(`[Manual Sync] Full sync timed out for ${channelId}. Retrying incremental sync.`);
        const { totalSynced } = await syncYouTubeChannel(channelId, true);
        return NextResponse.json({
          success: false,
          totalSynced,
          mode: "incremental",
          fallback: "full_sync_timed_out",
          error: "Full sync timed out. Incremental sync completed only. Trigger full sync again to continue backfill."
        }, { status: 408 });
      }
      throw error;
    }

  } catch (error: any) {
    console.error("Manual Sync Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
