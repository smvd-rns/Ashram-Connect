import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Keep the same access model as Harinam marking.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = Number(profile?.role);
    if (role !== 1 && role !== 3) {
      return NextResponse.json(
        { error: "Forbidden: only admin or attendance incharge" },
        { status: 403 },
      );
    }

    // Match report user sources to avoid any list mismatch:
    // 1) BCDB users
    // 2) attendance mapping users
    // 3) names from profiles for mapped emails
    const { data: bcdbUsers, error: bcdbError } = await supabase
      .from("bcdb")
      .select("email_id, initiated_name, legal_name")
      .eq("is_deleted", false);
    if (bcdbError) throw bcdbError;

    const { data: mappings, error: mappingsError } = await supabase
      .from("attendance_user_mapping")
      .select("user_email");
    if (mappingsError) throw mappingsError;

    const mappedEmails = [
      ...new Set(
        (mappings || [])
          .map((m: any) => (m?.user_email || "").toLowerCase().trim())
          .filter(Boolean),
      ),
    ];

    let profilesByEmail: Record<string, string> = {};
    if (mappedEmails.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .in("email", mappedEmails);
      if (profilesError) throw profilesError;

      (profiles || []).forEach((p: any) => {
        const email = (p?.email || "").toLowerCase().trim();
        if (!email) return;
        profilesByEmail[email] = p?.full_name || "";
      });
    }

    const byEmail = new Map<string, { email: string; full_name: string }>();

    (bcdbUsers || []).forEach((u: any) => {
      const email = (u?.email_id || "").toLowerCase().trim();
      if (!email) return;
      byEmail.set(email, {
        email,
        full_name: u?.initiated_name || u?.legal_name || email.split("@")[0],
      });
    });

    mappedEmails.forEach((email) => {
      if (!byEmail.has(email)) {
        byEmail.set(email, {
          email,
          full_name: profilesByEmail[email] || email.split("@")[0],
        });
      }
    });

    const users = Array.from(byEmail.values()).sort((a, b) =>
      (a.full_name || "").localeCompare(b.full_name || ""),
    );

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Attendance Users API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

