"use client";

/**
 * Utility to open links in the system browser or the native YouTube app.
 * This is crucial for Capacitor apps to "break out" of the internal WebView (the APK browser)
 * to prevent users from having full unrestricted browser access within the app.
 */
export const openExternal = (url: string) => {
  if (typeof window === "undefined") return;

  // 1. Check for Capacitor global object (injected by Capacitor)
  const isCapacitor = (window as any).Capacitor;

  if (isCapacitor) {
    // In Capacitor, window.open with '_system' or '_blank' (if set up) 
    // is traditionally used to trigger the app-opener/native browser.
    // This will force the YouTube app to open on Android if available.
    window.open(url, "_system");
  } else {
    // Standard web browser behavior
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
