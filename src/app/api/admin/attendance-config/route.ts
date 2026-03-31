import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * ATTENDANCE CONFIGURATION API
 * Manages authorized machines and global ingestion settings.
 */

export async function GET(req: NextRequest) {
  try {
    const { data: machines } = await supabase.from("attendance_machines").select("*").order("created_at", { ascending: false });
    const { data: settings } = await supabase.from("attendance_settings").select("*").eq("id", "global").single();

    return NextResponse.json({ machines, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === "add_machine") {
      const { serial_number, description } = data;
      const { data: newMachine, error } = await supabase
        .from("attendance_machines")
        .insert([{ serial_number: serial_number.toUpperCase(), description }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ machine: newMachine });
    }

    if (action === "update_settings") {
      const { sync_from_date } = data;
      const { data: updatedSettings, error } = await supabase
        .from("attendance_settings")
        .update({ sync_from_date, updated_at: new Date().toISOString() })
        .eq("id", "global")
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ settings: updatedSettings });
    }

    if (action === "update_machine") {
       const { id, start_time, end_time, description, is_active } = data;
       const { data: updatedMachine, error } = await supabase
         .from("attendance_machines")
         .update({ start_time, end_time, description, is_active })
         .eq("id", id)
         .select()
         .single();
       
       if (error) throw error;
       return NextResponse.json({ machine: updatedMachine });
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

    const { error } = await supabase.from("attendance_machines").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
