import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import admin from "./firebase-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
}

/**
 * Send a push notification to a list of user IDs
 * Targets all registered devices (Web and FCM) for each user
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    // 1. Fetch all active subscriptions for these users
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("subscription, provider, user_id, device_type")
      .in("user_id", userIds);

    if (error) {
      console.error("Error fetching push subscriptions:", error);
      return;
    }

    if (!subs || subs.length === 0) {
      console.log(`No active subscriptions found for [${userIds.length}] users.`);
      return;
    }

    console.log(`Attempting to send push to ${subs.length} devices...`);

    // 2. Map subscriptions to delivery promises
    const pushPromises = subs.map(async (s, index) => {
      try {
        // CHANNEL A: Web Push (Laptop/Desktop/PWA Browser)
        if (!s.provider || s.provider === 'web-push') {
          if (!publicKey || !privateKey) {
             console.warn("VAPID keys missing, skipping Web Push.");
             return;
          }
          
          webpush.setVapidDetails('mailto:shyam@ashramconnect.com', publicKey, privateKey);
          
          await webpush.sendNotification(s.subscription, JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/notifications', // Default to history page
            icon: payload.icon || '/favicon.ico',
            badge: payload.badge || '/favicon.ico'
          }));
          
          console.log(`[WebPush] Success: Device ${index} (User: ${s.user_id})`);
        } 
        
        // CHANNEL B: Firebase FCM (Native Mobile App)
        else if (s.provider === 'fcm' && s.subscription?.token) {
          const message = {
            token: s.subscription.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: {
              url: payload.url || '/notifications', // Default to history page
              icon: payload.icon || '/favicon.ico'
            },
            android: {
              priority: 'high' as const,
              notification: {
                channelId: 'default',
                sound: 'default'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1
                }
              }
            }
          };

          await admin.messaging().send(message);
          console.log(`[FCM] Success: Device ${index} (User: ${s.user_id})`);
        }
      } catch (err: any) {
        // Handle expired subscriptions (410 Gone for Web Push)
        if (err.statusCode === 410) {
          console.log(`Cleaning up expired subscription for user ${s.user_id}`);
          await supabase.from("push_subscriptions").delete().eq("subscription_key", err.endpoint || s.subscription?.endpoint);
        } else {
          console.error(`Push delivery failed for Device ${index} (${s.provider}):`, err.message);
        }
      }
    });

    await Promise.allSettled(pushPromises);
  } catch (err) {
    console.error("Critical error in sendPushToUsers:", err);
  }
}

/**
 * Automatically fetch managers (Role 1 and 5) and notify them
 */
export async function notifyManagers(payload: PushPayload) {
  try {
    const { data: managers, error } = await supabase
      .from("profiles")
      .select("id")
      .in("role", [1, 5]);

    if (error) {
      console.error("Error fetching managers for notification:", error);
      return;
    }

    if (managers && managers.length > 0) {
      const managerIds = managers.map(m => m.id);
      await sendPushToUsers(managerIds, payload);
    }
  } catch (err) {
    console.error("Critical error in notifyManagers:", err);
  }
}

/**
 * Broadcast a notification to EVERY registered device in the database
 */
export async function notifyAllUsers(payload: PushPayload) {
  try {
    // 1. Fetch all unique user IDs that have at least one subscription
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    if (error) {
      console.error("Error fetching all users for broadcast:", error);
      return;
    }

    if (subs && subs.length > 0) {
      // Unique user IDs
      const allUserIds = Array.from(new Set(subs.map(s => s.user_id)));
      console.log(`Broadcasting to ${allUserIds.length} users...`);
      await sendPushToUsers(allUserIds, payload);
    } else {
      console.log("No registered users found for broadcast.");
    }
  } catch (err) {
    console.error("Critical error in notifyAllUsers:", err);
  }
}
