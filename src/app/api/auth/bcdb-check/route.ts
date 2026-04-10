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

    const normalizedEmail = email?.toLowerCase().trim() || "";
    if (!normalizedEmail) return NextResponse.json({ isBcdb: false });

    // Race the query against a 5-second timeout
    const { count, error } = await Promise.race([
      supabase
        .from("bcdb")
        .select("*", { count: "exact", head: true })
        .or(`email_id.ilike.${normalizedEmail},email_address.ilike.${normalizedEmail}`)
        .eq("is_deleted", false),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase Connection Timeout")), 5000))
    ]).catch(err => ({ count: null, error: err }));

    if (error) {
      if (error.message === "Supabase Connection Timeout") {
        console.error("BCDB Check Timeout:", error.message);
        return NextResponse.json({ error: "Database timeout. Check connection." }, { status: 504 });
      }
      throw error;
    }

    return NextResponse.json({ isBcdb: !!count });
  } catch (error: any) {
    console.error("BCDB Check Error:", error.message);
    return NextResponse.json({ isBcdb: false }, { status: 500 });
  }
}
