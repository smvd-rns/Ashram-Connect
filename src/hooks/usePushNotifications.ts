import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing push notifications across the app.
 * Handles auto-syncing local registration with the server.
 */
export function usePushNotifications(session: any) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const syncSubscription = useCallback(async (subscription: PushSubscription, provider = 'web-push') => {
    if (!session?.access_token) return;
    
    try {
      console.log(`[PushHook] Syncing ${provider} subscription with server...`);
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          subscription,
          provider,
          device_type: window.innerWidth < 768 ? 'mobile' : 'desktop' 
        })
      });
      
      if (res.ok) {
        setPushEnabled(true);
        console.log("[PushHook] Server sync successful.");
      }
    } catch (err) {
      console.error("[PushHook] Sync failed:", err);
    }
  }, [session?.access_token]);

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setPushEnabled(!!subscription);
      setPermission(Notification.permission);
      
      // AUTO-SYNC: If we have a local subscription but it's not active on server 
      // (or we just want to be sure), we sync it.
      if (subscription) {
        await syncSubscription(subscription);
      }
    } catch (err) {
      console.error("[PushHook] Status check failed:", err);
    }
  }, [syncSubscription]);

  const subscribe = async () => {
    if (typeof window === 'undefined') return;
    setIsSubscribing(true);
    
    try {
      // 1. Register Service Worker
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 2. Get Public Key from env
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) throw new Error("VAPID public key missing");

      // 3. Subscribe via PushManager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // 4. Send to server
      await syncSubscription(subscription);
      setPermission(Notification.permission);
      return true;
    } catch (err) {
      console.error("[PushHook] Subscription failed:", err);
      throw err;
    } finally {
      setIsSubscribing(false);
    }
  };

  // Setup Native Bridge for FCM (Mobile Apps)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    (window as any).registerFcmToken = async (fcmToken: string) => {
      console.log("[PushHook] FCM Token received from bridge:", fcmToken);
      const mockSub = { token: fcmToken } as any;
      await syncSubscription(mockSub, 'fcm');
    };
  }, [syncSubscription]);

  // Run initial check
  useEffect(() => {
    if (session) {
      checkStatus();
    }
  }, [session, checkStatus]);

  return { pushEnabled, isSubscribing, permission, subscribe, checkStatus };
}
