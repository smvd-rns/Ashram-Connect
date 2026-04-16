import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, roles")
      .eq("id", user.id)
      .single();

    const roles = Array.isArray(profile?.roles) ? profile.roles : [profile?.role].filter(r => r != null);
    if (!roles.includes(1) && !roles.includes(3)) {
      return NextResponse.json({ error: "Forbidden: only admin or attendance incharge" }, { status: 403 });
    }

    const body = await req.json();
    const { action, data } = body;

    if (action === "update_harinam") {
      const { user_email, date, ...updates } = data;
      
      // Fetch existing record to perform partial merge (upsert replaces)
      const { data: existing } = await supabase
        .from("harinam_attendance")
        .select("*")
        .eq("user_email", user_email)
        .eq("date", date)
        .maybeSingle();

      const merged = {
        user_email,
        date,
        h7am: existing?.h7am ?? 0,
        h740am: existing?.h740am ?? 0,
        hpdc: existing?.hpdc ?? 0,
        hcustom_mins: existing?.hcustom_mins ?? 0,
        ...updates
      };

      const { data: record, error } = await supabase
        .from("harinam_attendance")
        .upsert(merged, { onConflict: 'user_email,date' })
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ success: true, record });
    }

    if (action === "bulk_update_harinam") {
      const { emails, date, update } = data;
      
      // Fetch existing records for these users/date
      const { data: existingRecords } = await supabase
        .from("harinam_attendance")
        .select("*")
        .in("user_email", emails)
        .eq("date", date);

      const existingMap = new Map((existingRecords || []).map(r => [r.user_email, r]));

      const recordsToUpsert = emails.map((email: string) => {
        const existing = existingMap.get(email);
        return {
          user_email: email,
          date: date,
          h7am: existing?.h7am ?? 0,
          h740am: existing?.h740am ?? 0,
          hpdc: existing?.hpdc ?? 0,
          hcustom_mins: existing?.hcustom_mins ?? 0,
          ...update
        };
      });

      const { error } = await supabase
        .from("harinam_attendance")
        .upsert(recordsToUpsert, { onConflict: 'user_email,date' });
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Harinam Admin API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
