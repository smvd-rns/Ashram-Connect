import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// GET: Fetch assignments for a specific channel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("youtube_channel_assignments")
      .select("*, profiles(full_name, email)")
      .eq("channel_id", channelId);

    if (error) throw error;
    return NextResponse.json({ assignments: data || [] });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST: Add an assignment (supports single or bulk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channel_id, user_id, user_ids } = body;

    if (user_ids && Array.isArray(user_ids)) {
      const assignments = user_ids.map(uid => ({ channel_id, user_id: uid }));
      const { data, error } = await supabase
        .from("youtube_channel_assignments")
        .upsert(assignments, { onConflict: 'channel_id,user_id' })
        .select();
      if (error) throw error;
      return NextResponse.json({ data });
    } else {
      const { data, error } = await supabase
        .from("youtube_channel_assignments")
        .upsert([{ channel_id, user_id }], { onConflict: 'channel_id,user_id' })
        .select();
      if (error) throw error;
      return NextResponse.json({ data });
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to assign users" }, { status: 500 });
  }
}

// DELETE: Remove an assignment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const { error } = await supabase
      .from("youtube_channel_assignments")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Assignment removed" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to remove assignment" }, { status: 500 });
  }
}
