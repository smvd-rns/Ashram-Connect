import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseYtAdmin } from "@/lib/supabase-yt";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to sync to the YouTube DB
async function syncToYtDb(channelId: string, name: string, visibility: string, isDelete = false) {
  if (!supabaseYtAdmin) return;
  
  if (isDelete) {
    await supabaseYtAdmin.from("youtube_channels").delete().eq("channel_id", channelId);
  } else {
    await supabaseYtAdmin.from("youtube_channels").upsert({
      channel_id: channelId,
      name,
      visibility
    }, { onConflict: 'channel_id' });
  }
}

// GET: Fetch all channels for management
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("youtube_channels")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ channels: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// POST: Add new channel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = { ...body, visibility: body.visibility || 'public' };
    
    // 1. Insert into Main DB
    const { data, error } = await supabase
      .from("youtube_channels")
      .insert([payload])
      .select();

    if (error) throw error;

    // 2. Sync to YouTube DB
    if (data?.[0]) {
      await syncToYtDb(data[0].channel_id, data[0].name, data[0].visibility);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Insert error:", err);
    return NextResponse.json({ error: "Failed to insert" }, { status: 500 });
  }
}

// PUT: Update channel
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    // 1. Update Main DB
    const { data, error } = await supabase
      .from("youtube_channels")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    // 2. Sync to YouTube DB if critical fields changed
    if (data?.[0]) {
      await syncToYtDb(data[0].channel_id, data[0].name, data[0].visibility);
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE: Remove channel
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Get channel_id before deleting
    const { data: channel } = await supabase.from("youtube_channels").select("channel_id").eq("id", id).single();

    // 1. Delete from Main DB
    const { error } = await supabase
      .from("youtube_channels")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // 2. Delete from YouTube DB
    if (channel?.channel_id) {
      await syncToYtDb(channel.channel_id, "", "", true);
    }

    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
