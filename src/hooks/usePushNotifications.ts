import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing push notifications across the app.
 * Handles auto-syncing local registration with the server.
 */
export function usePushNotifications(session: any) {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const syncSubscription = useCallback(async (subscription: any, provider = 'web-push') => {
    if (!session?.access_token) {
      console.log("[PushDiag] No session, skipping sync.");
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log(`[PushDiag] Syncing ${provider} subscription with server...`);
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
        console.log(`[PushDiag] Server sync successful (${provider}).`);
      } else {
        const err = await res.json();
        console.error(`[PushDiag] Server sync failed: ${err.error}`);
      }
    } catch (err) {
      console.error("[PushDiag] Network error during sync:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [session?.access_token]);

  const checkStatus = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Check if we are in a Native (FCM) environment first
    const isNative = (window as any).isNativeApp === true;
    
    if (isNative) {
      console.log("[PushDiag] Native environment detected. Waiting for FCM bridge...");
      // For native, we rely on the registerFcmToken bridge callback
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log("[PushDiag] Push API not supported in this browser.");
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      console.log("[PushDiag] Local subscription found:", !!subscription);
      
      setPushEnabled(!!subscription);
      setPermission(Notification.permission);
      
      if (subscription) {
        console.log("[PushDiag] Proactively re-syncing existing web-push registration...");
        await syncSubscription(subscription);
      } else {
        console.log("[PushDiag] No local subscription found.");
      }
    } catch (err) {
      console.error("[PushDiag] Status check failed:", err);
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
      console.error("[PushDiag] Subscription failed:", err);
      throw err;
    } finally {
      setIsSubscribing(false);
    }
  };

  // Setup Native Bridge for FCM (Mobile Apps)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log("[PushDiag] Setting up Global registerFcmToken listener.");
    (window as any).registerFcmToken = (fcmToken: string) => {
      console.log("[PushDiag] FCM Token received from native bridge:", fcmToken);
      const mockSub = { token: fcmToken } as any;
      syncSubscription(mockSub, 'fcm');
    };

    return () => {
      // Don't delete it on unmount as native might call it later
    };
  }, [syncSubscription]);

  // Run initial check
  useEffect(() => {
    if (session) {
      checkStatus();
    }
  }, [session, checkStatus]);

  return { pushEnabled, isSubscribing, isSyncing, permission, subscribe, checkStatus };
}
