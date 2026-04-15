import { NextRequest, NextResponse } from "next/server";
import { supabaseIdkt, supabaseIdktAdmin } from "@/lib/supabaseIdkt";

export const dynamic = "force-dynamic";

/**
 * IDKT SEARCH API
 * Global fuzzy search across all audio lectures.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const role = Number(searchParams.get("role") || 0);

    // Use admin client for admins to bypass RLS filtering on is_hidden
    const client = (role === 1 && supabaseIdktAdmin) ? supabaseIdktAdmin : supabaseIdkt;

    if (!client) {
      return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }

    let dbQuery = client
      .from("idkt_items")
      .select("*")
      .eq("type", "audio")
      .ilike("name", `%${query}%`);

    if (role !== 1) {
      dbQuery = dbQuery.eq("is_hidden", false);
    }

    const { data: items, error } = await dbQuery.limit(50);

    if (error) throw error;

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
