import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeQuery } from "@/lib/resilient-db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");

    const normalizedEmail = email?.toLowerCase().trim() || "";
    if (!normalizedEmail) return NextResponse.json({ isBcdb: false });

    // Perform a resilient query with automatic retries for timeouts
    const { count, error } = await safeQuery(async () => 
        await supabase
            .from("bcdb")
            .select("*", { count: "exact", head: true })
            .or(`email_id.ilike.${normalizedEmail},email_address.ilike.${normalizedEmail}`)
            .eq("is_deleted", false),
        "BCDB Email Check"
    ).catch(err => ({ count: null, error: err }));

    if (error) {
      if (error.message === "Supabase Connection Timeout") {
        console.error("BCDB Check Timeout:", error.message);
        return NextResponse.json({ error: "Database timeout. Check connection." }, { status: 504 });
      }
      throw error;
    }

    const isVerified = !!count;

    // If verified and a userId is provided, persist this to the profile so we don't have to check again
    if (isVerified && userId) {
      try {
        await supabase
          .from("profiles")
          .update({ is_bcdb_verified: true })
          .eq("id", userId);
      } catch (updateErr) {
        console.warn("Failed to update profile verification status:", updateErr);
      }
    }

    return NextResponse.json({ isBcdb: isVerified });
  } catch (error: any) {
    console.error("BCDB Check Error:", error.message);
    return NextResponse.json({ isBcdb: false }, { status: 500 });
  }
}
