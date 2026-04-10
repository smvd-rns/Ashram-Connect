import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase
      .from("bcdb")
      .select("*")
      .or(`email_id.ilike.${normalizedEmail},email_address.ilike.${normalizedEmail}`)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "No BCDB record found" }, { status: 404 });

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("BCDB Details API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
