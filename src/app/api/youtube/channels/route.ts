import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("youtube_channels")
      .select("*")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ channels: data || [] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}
