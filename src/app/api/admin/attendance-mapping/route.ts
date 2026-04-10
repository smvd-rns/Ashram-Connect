import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeQuery } from "@/lib/resilient-db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ATTENDANCE USER MAPPING API
 * Manages the link between Biometric Machine ID and System User Email.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get("machine_id");

    let query = supabase
      .from("attendance_user_mapping")
      .select("*")
      .order("created_at", { ascending: false });

    if (machineId) query = query.eq("machine_id", machineId);

    const { data: mappings, error } = await safeQuery(() => query, "Fetch Attendance Mappings");
    if (error) throw error;

    return NextResponse.json({ mappings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    // SINGLE ADDITION
    if (action === "add_mapping") {
      const { machine_id, zk_user_id, user_email } = data;

      // Check if this user email OR this machine user ID is already mapped for this specific machine
      const { data: existing, error: checkError } = await safeQuery(() => 
        supabase
            .from("attendance_user_mapping")
            .select("user_email, zk_user_id")
            .eq("machine_id", machine_id)
            .or(`user_email.eq.${user_email},zk_user_id.eq.${zk_user_id}`)
            .maybeSingle(),
        "Check Duplicate Mapping"
      );

      if (existing) {
        const conflictField = existing.user_email === user_email ? "Email" : "Machine User ID";
        return NextResponse.json({ 
          error: `Duplicate Entry: This ${conflictField} is already mapped to this machine.` 
        }, { status: 400 });
      }

      const { data: newMapping, error } = await safeQuery(() => 
        supabase
            .from("attendance_user_mapping")
            .insert([{ machine_id, zk_user_id, user_email }])
            .select()
            .single(),
        "Add New Mapping"
      );
      
      if (error) throw error;
      return NextResponse.json({ mapping: newMapping });
    }

    // BULK ADDITION (XLSX Upload)
    if (action === "bulk_add_mapping") {
      const { data: newMappings, error } = await safeQuery(() => 
        supabase
            .from("attendance_user_mapping")
            .upsert(data, { onConflict: "machine_id, zk_user_id" }),
        "Bulk Upsert Mappings"
      );
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await safeQuery(() => 
        supabase.from("attendance_user_mapping").delete().eq("id", id),
        "Delete Mapping"
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
