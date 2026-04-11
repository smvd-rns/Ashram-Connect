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
    const { title, body, url, icon, target = "all", userIds = [] } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Title and Body are required" }, { status: 400 });
    }

    // 3. Resolve Target Users
    let resolvedUserIds: string[] = [];
    
    if (target === "manual") {
        resolvedUserIds = userIds;
    } else if (target === "bcdb") {
        // Fetch all profiles whose email exists in the bcdb table
        const { data: bcdbUsers } = await supabaseAdmin!
            .from("bcdb")
            .select("email_id, email_address")
            .eq("is_deleted", false);
        
        if (bcdbUsers) {
            const bcdbEmails = bcdbUsers.map(u => (u.email_id || u.email_address)?.toLowerCase().trim()).filter(Boolean);
            const { data: profiles } = await supabaseAdmin!
                .from("profiles")
                .select("id")
                .in("email", bcdbEmails);
            
            if (profiles) resolvedUserIds = profiles.map(p => p.id);
        }
    }

    const targetUrl = url || '/notifications';

    // 4. Save to History
    const { error: historyError } = await supabaseAdmin!
        .from("notifications_history")
        .insert({
            title,
            body,
            url: targetUrl,
            icon: icon || '/favicon.ico',
            sender_id: user.id,
            target_type: target === 'all' ? 'all' : 'targeted',
            recipient_ids: (target === 'all') ? [] : resolvedUserIds
        });
    
    if (historyError) {
        console.warn("Could not save to notifications_history:", historyError.message);
    }

    // 5. Trigger Broadcasts (Async)
    (async () => {
        console.log(`Starting targeted broadcast (${target}): ${title}`);
        
        // A. REALTIME BROADCAST
        // We broadcast to the global channel, but only the targeted UI would display it if we wanted strictness.
        // For now, simple global broadcast handles instant display.
        await supabaseAdmin!.channel('broadcast_notifications').send({
            type: 'broadcast',
            event: 'new_alert',
            payload: { 
              title, 
              body, 
              url: targetUrl, 
              icon: icon || '/favicon.ico',
              target_type: target === 'all' ? 'all' : 'targeted',
              recipient_ids: (target === 'all') ? [] : resolvedUserIds
            }
        });

        // B. PUSH NOTIFICATIONS
        if (target === "all") {
            await notifyAllUsers({ title, body, url: targetUrl });
        } else if (resolvedUserIds.length > 0) {
            const { sendPushToUsers } = require("@/lib/notifications");
            await sendPushToUsers(resolvedUserIds, { title, body, url: targetUrl });
        }
    })();

    return NextResponse.json({ 
        success: true, 
        message: target === "all" ? "Broadcast sent to everyone" : `Targeted broadcast sent to ${resolvedUserIds.length} users`
    });
  } catch (error: any) {
    console.error("Broadcast Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
