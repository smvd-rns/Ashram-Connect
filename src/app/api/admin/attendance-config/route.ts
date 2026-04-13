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
      const { serial_number, description, ingestion_start, ingestion_end, p_start, p_end, l_start, l_end } = data;
      const { data: newMachine, error } = await supabase
        .from("attendance_machines")
        .insert([{ 
          serial_number: serial_number.toUpperCase(), 
          description,
          ingestion_start: ingestion_start || "02:00:00",
          ingestion_end: ingestion_end || "11:00:00",
          p_start: p_start || "04:00:00",
          p_end: p_end || "04:15:00",
          l_start: l_start || "04:15:00",
          l_end: l_end || "05:30:00"
        }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ machine: newMachine });
    }

    if (action === "update_settings") {
      const { sync_from_date, prasadam_start_time, prasadam_end_time, prasadam_machine_ids } = data;
      const { data: updatedSettings, error } = await supabase
        .from("attendance_settings")
        .update({ 
          sync_from_date, 
          prasadam_start_time, 
          prasadam_end_time, 
          prasadam_machine_ids,
          updated_at: new Date().toISOString() 
        })
        .eq("id", "global")
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ settings: updatedSettings });
    }

    if (action === "update_machine") {
       const { id, ...updates } = data;
       
       // Filter out undefined values to support partial updates
       const filteredUpdates: any = {};
       const allowedFields = [
         "ingestion_start", "ingestion_end", 
         "p_start", "p_end", 
         "l_start", "l_end", 
         "description", "is_active", "serial_number"
       ];
       allowedFields.forEach(field => {
         if (updates[field] !== undefined) {
           filteredUpdates[field] = updates[field];
         }
       });

       const { data: updatedMachine, error } = await supabase
         .from("attendance_machines")
         .update(filteredUpdates)
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
