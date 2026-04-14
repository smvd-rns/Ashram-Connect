import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * IDKT MANAGEMENT API
 * Handles hiding, showing, and recursive deletion of library items.
 * Restricted to Super Admins (Role 1).
 */
export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase service role key missing" }, { status: 500 });
  }

  try {
    const { action, id, full_path, type, userRole } = await req.json();

    // Secondary verification (Security)
    if (Number(userRole) !== 1) {
      return NextResponse.json({ error: "Unauthorized. Admin role required." }, { status: 403 });
    }

    if (!full_path) {
      return NextResponse.json({ error: "Path missing" }, { status: 400 });
    }

    if (action === "delete") {
      if (type === "folder") {
        // Recursive Delete: Item itself + anything starting with its path
        const { error } = await supabaseAdmin
          .from("idkt_items")
          .delete()
          .or(`full_path.eq."${full_path}",full_path.like."${full_path}%"`);
        
        if (error) throw error;
      } else {
        // Single Item Delete
        const { error } = await supabaseAdmin
          .from("idkt_items")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
      }
      return NextResponse.json({ success: true, message: `Deleted ${type} successfully` });
    }

    if (action === "hide" || action === "unhide") {
      const is_hidden = action === "hide";
      
      if (type === "folder") {
        // Recursive Hide/Unhide
        const { error } = await supabaseAdmin
          .from("idkt_items")
          .update({ is_hidden })
          .or(`full_path.eq."${full_path}",full_path.like."${full_path}%"`);
        
        if (error) throw error;
      } else {
        // Single Item Hide/Unhide
        const { error } = await supabaseAdmin
          .from("idkt_items")
          .update({ is_hidden })
          .eq("id", id);
        
        if (error) throw error;
      }
      return NextResponse.json({ success: true, message: `${is_hidden ? 'Hidden' : 'Shown'} successfully` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Management API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
