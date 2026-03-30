import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Note: Use Service Role Key for Admin operations to bypass RLS if needed, 
// but here we rely on the is_admin() function in RPC or explicit session check.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { data, error } = await supabase
      .from("youtube_channels")
      .insert([body])
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to insert" }, { status: 500 });
  }
}

// PUT: Update channel
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const { data, error } = await supabase
      .from("youtube_channels")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE: Remove channel
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { error } = await supabase
      .from("youtube_channels")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
