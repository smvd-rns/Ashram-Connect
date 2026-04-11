import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyAllUsers } from "@/lib/notifications";
import { safeAuth, safeQuery } from "@/lib/resilient-db";

/**
 * POST: Broadcast a notification to all registered users
 * Restricted to Role 1 (Super Admin) and Role 5 (Manager)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server configuration missing (Admin API)" }, { status: 500 });
    }

    const token = authHeader.split(" ")[1];
    
    // 1. Verify Privilege
    const { data: { user }, error: authError } = await safeAuth(() => supabaseAdmin!.auth.getUser(token), "Broadcast Auth");
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: profile } = await safeQuery(async () => 
      await supabaseAdmin!.from("profiles").select("role").eq("id", user.id).single(),
      "Broadcast Profile Check"
    );

    if (profile?.role !== 1 && profile?.role !== 5) {
      return NextResponse.json({ error: "Forbidden: Manager access required" }, { status: 403 });
    }

    // 2. Parse Payload
    const { title, body, url, icon } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Title and Body are required" }, { status: 400 });
    }

    // 3. Save to History (Optional failure)
    const { error: historyError } = await supabaseAdmin!
        .from("notifications_history")
        .insert({
            title,
            body,
            url: url || '/',
            icon: icon || '/favicon.ico',
            sender_id: user.id
        });
    
    if (historyError) {
        console.warn("Could not save to notifications_history (Table might not exist yet):", historyError.message);
    }

    // 4. Trigger Broadcasts (Async)
    (async () => {
        console.log(`Starting multi-channel broadcast: ${title}`);
        
        // A. REALTIME BROADCAST (For active users)
        await supabaseAdmin!.channel('broadcast_notifications').send({
            type: 'broadcast',
            event: 'new_alert',
            payload: { title, body, url: url || '/', icon: icon || '/favicon.ico' }
        });

        // B. PUSH NOTIFICATIONS (For background/offline users)
        await notifyAllUsers({
            title,
            body,
            url: url || '/',
            icon: icon || '/favicon.ico'
        });
    })();

    return NextResponse.json({ success: true, message: "Broadcast initiated across all channels" });
  } catch (error: any) {
    console.error("Broadcast Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
