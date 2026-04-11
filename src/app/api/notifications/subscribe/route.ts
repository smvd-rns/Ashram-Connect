import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role to manage subscriptions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: Subscribe a user's device for push notifications
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    // Create a temporary client to get the user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { subscription, device_type, provider } = await req.json();

    if (!subscription || (!subscription.endpoint && !subscription.token)) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    const subscriptionKey = provider === 'fcm' ? subscription.token : subscription.endpoint;

    //Upsert the subscription for this user and standardized key
    console.log(`[PushServer] Syncing subscription for user ${user.id} (${provider})...`);
    const { error: dbError } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: user.id,
        subscription,
        subscription_key: subscriptionKey,
        provider: provider || 'web-push',
        device_type: device_type || 'unknown',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, subscription_key' } as any);

    if (dbError) {
      console.error("[PushServer] Database Error during upsert:", dbError.message);
      throw dbError;
    }

    console.log(`[PushServer] Successfully synced subscription for ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PushServer] General Subscription Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Unsubscribe a device
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("subscription_key", endpoint);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unsubscribe Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
