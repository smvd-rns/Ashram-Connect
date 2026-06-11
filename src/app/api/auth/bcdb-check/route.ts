import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeQuery } from "@/lib/resilient-db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.email;
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

    // If verified, persist this to the profile so we don't have to check again
    if (isVerified) {
      try {
        await supabase
          .from("profiles")
          .update({ is_bcdb_verified: true })
          .eq("id", user.id);
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
