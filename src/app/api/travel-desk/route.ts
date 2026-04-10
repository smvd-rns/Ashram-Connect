import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// Configure Web Push with VAPID keys
webpush.setVapidDetails(
  'mailto:shyam@ashramconnect.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper: Send Push Notification to a user or group of users
 */
async function sendPushToUsers(userIds: string[], payload: any) {
  try {
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .in("user_id", userIds);

    if (error || !subs) return;

    const pushPromises = subs.map(s => 
      webpush.sendNotification(s.subscription, JSON.stringify(payload))
        .catch(err => {
          console.error("Push delivery failed for subscription:", err.endpoint);
          // If 410 Gone, we should delete the subscription
          if (err.statusCode === 410) {
            supabase.from("push_subscriptions").delete().eq("subscription->>endpoint", err.endpoint);
          }
        })
    );

    await Promise.allSettled(pushPromises);
  } catch (err) {
    console.error("Push helper error:", err);
  }
}

// GET: Fetch submissions (Manager only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Fetch Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let dbQuery = supabase.from("travel_submissions").select("*").eq("is_deleted", false);

    // If NOT manager (Role 5) or Super Admin (Role 1), restrict to OWN data
    if (profile?.role !== 1 && profile?.role !== 5) {
      dbQuery = dbQuery.eq("user_id", user.id);
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Travel Desk GET Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a form (BCDB users only)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const { 
      email_id, 
      devotee_name, 
      departure_date, 
      return_date, 
      places_of_travel, 
      purpose_of_travel, 
      accompanying_bcari, 
      counselor_email 
    } = body;

    // Validation
    if (!email_id || !devotee_name || !departure_date || !return_date || !places_of_travel || !purpose_of_travel) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("travel_submissions")
      .insert([{
        user_id: user.id,
        email_id,
        devotee_name,
        departure_date,
        return_date,
        places_of_travel,
        purpose_of_travel,
        accompanying_bcari,
        counselor_email,
        status: 'Pending'
      }])
      .select()
      .single();

    if (error) throw error;

    // BACKGROUND TASK: Notify All Managers (Role 5) and Super Admins (Role 1)
    (async () => {
        const { data: managers } = await supabase
            .from("profiles")
            .select("id")
            .in("role", [1, 5]);
        
        if (managers && managers.length > 0) {
            const managerIds = managers.map(m => m.id);
            await sendPushToUsers(managerIds, {
                title: "New Travel Request!",
                body: `${devotee_name} has logged a new movement to ${places_of_travel}.`,
                url: "/travel-desk",
                icon: "/favicon.ico"
            });
        }
    })();

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Travel Desk POST Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update status (Manager only)
export async function PATCH(req: NextRequest) {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return NextResponse.json({ error: "Auth required" }, { status: 401 });
  
      const token = authHeader.split(" ")[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  
      // Check if user is Manager (Role 5) or Super Admin (Role 1)
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== 1 && profile?.role !== 5) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  
      const body = await req.json();
      const { id, status } = body;
  
      const { data, error } = await supabase
        .from("travel_submissions")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
  
      if (error) throw error;

      // BACKGROUND TASK: Notify the Devotee about the status change
      (async () => {
        await sendPushToUsers([data.user_id], {
            title: "Travel Request Update",
            body: `Your travel request to ${data.places_of_travel} has been marked as ${status}.`,
            url: "/travel-desk",
            icon: "/favicon.ico"
        });
      })();

      return NextResponse.json({ data });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

