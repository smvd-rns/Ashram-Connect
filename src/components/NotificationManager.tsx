"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, X, Info, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";

/**
 * Global Notification Manager
 * Handles:
 * 1. Auto-syncing push tokens (Default-On logic)
 * 2. Supabase Realtime fallback (Instant in-app alerts)
 * 3. Proactive permission prompting
 */
export default function NotificationManager({ session }: { session: any }) {
  const { pushEnabled, isSyncing, permission, subscribe, checkStatus } = usePushNotifications(session);
  const [activeToast, setActiveToast] = useState<{ title: string; body: string; url?: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // 1. REALTIME LISTENER
  useEffect(() => {
    if (!session) return;

    console.log("[NotificationManager] Initializing Realtime fallback...");
    const channel = supabase.channel('broadcast_notifications')
      .on('broadcast', { event: 'new_alert' }, (payload) => {
        console.log("[NotificationManager] Realtime alert received:", payload);
        const { title, body, url } = payload.payload;
        
        // Show In-App Toast
        setActiveToast({ title, body, url });

        // Trigger native notification if push failed or as double-delivery
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // 2. AUTO-SYNC & DEFAULT-ON LOGIC
  useEffect(() => {
    if (!session) return;

    // If already granted, ensure we are synced with server
    if (permission === 'granted' && !pushEnabled && !isSyncing) {
        console.log("[NotificationManager] Permission granted but not enabled. Auto-syncing...");
        checkStatus();
    }

    // If default (not asked), show a non-intrusive prompt after 3 seconds
    if (permission === 'default' && !pushEnabled) {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
    }
  }, [session, permission, pushEnabled, isSyncing, checkStatus]);

  const handleSubscribe = async () => {
    try {
        await subscribe();
        setShowPrompt(false);
    } catch (err) {
        console.error("Setup failed");
    }
  };

  if (!session) return null;

  return (
    <>
      {/* 0. Proactive Sync Indicator (Mobile only, subtle) */}
      {isSyncing && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 animate-pulse">
           <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
           <span className="text-[9px] font-black text-white uppercase tracking-widest">Syncing App Alerts...</span>
        </div>
      )}

      {/* 1. Global In-App Toast (Realtime Fallback) */}
      {activeToast && (
        <div className="fixed top-4 sm:top-20 right-4 left-4 sm:left-auto z-[9999] sm:w-[400px] animate-in slide-in-from-top-4 sm:slide-in-from-right-8 duration-500">
          <div className="bg-white/95 backdrop-blur-3xl border-2 border-purple-500/20 rounded-3xl shadow-[0_20px_50px_rgba(147,51,234,0.15)] p-5 sm:p-6 ring-1 ring-black/5 overflow-hidden">
            {/* Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1 bg-purple-500/20 w-full">
               <div className="h-full bg-purple-500 animate-out fade-out slide-out-to-left fill-mode-forwards duration-[5000ms]" />
            </div>

            <button 
              onClick={() => setActiveToast(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-200">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">New Alert</span>
                   <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h4 className="font-black font-outfit text-slate-900 truncate mt-1 text-sm sm:text-base">{activeToast.title}</h4>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">{activeToast.body}</p>
                {activeToast.url && (
                  <Link 
                    href={activeToast.url} 
                    onClick={() => setActiveToast(null)}
                    className="inline-flex items-center gap-2 mt-4 text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] hover:gap-3 transition-all"
                  >
                    View Details <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Proactive Setup Prompt (Default-On Logic) */}
      {showPrompt && (
        <div className="fixed bottom-24 left-4 right-4 z-[9998] sm:left-auto sm:right-8 sm:w-[400px] animate-in slide-in-from-bottom-8 duration-500">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
             
             <div className="relative z-10 flex items-start gap-5">
               <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shrink-0">
                 <AlertCircle className="w-7 h-7 text-purple-400" />
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black font-outfit tracking-tight">Stay Connected</h3>
                    <button onClick={() => setShowPrompt(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 <p className="text-white/60 text-sm font-medium mt-2 leading-relaxed">
                   Enable push notifications for real-time alerts. 
                   <span className="block mt-2 text-[10px] font-bold text-amber-400/80 italic">
                     iPhone users: You must "Add to Home Screen" first.
                   </span>
                 </p>
                 <div className="mt-6 flex flex-col gap-3">
                   <button 
                     onClick={handleSubscribe}
                     className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition-all active:scale-95 shadow-lg"
                   >
                     Turn On Notifications
                   </button>
                   <button 
                     onClick={() => setShowPrompt(false)}
                     className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors py-2"
                   >
                     Maybe Later
                   </button>
                 </div>
               </div>
             </div>
           </div>
        </div>
      )}
    </>
  );
}
