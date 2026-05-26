"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import Navbar from "@/components/Navbar";
import { Loader2, ShieldAlert, ExternalLink, RefreshCw, Monitor, AlertTriangle } from "lucide-react";

export default function SmsSenderPage() {
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const { profile, loading: profileLoading, isSuperAdmin } = useProfile(session);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Wait until both session AND profile have loaded before rendering access gate
  if (sessionLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-devo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-outfit">
      <Navbar />
      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-20">
        {!isSuperAdmin ? (
          /* Access Restricted Gate */
          <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-200 text-center max-w-2xl mx-auto space-y-6 mt-20">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-devo-950 uppercase tracking-tight">Access Restricted</h1>
            <p className="text-slate-500 font-bold leading-relaxed italic">
              "Authority is derived from character and service, yet compliance is the pillar of harmony."
            </p>
            <p className="text-slate-400 font-medium">
              The SMS Sender portal is only visible to authorized administrators. If you believe this is an error, please contact the administrator.
            </p>
          </div>
        ) : (
          <>
            {/* ─── LAPTOP VIEW (Hidden on Mobile/Tablet) ─── */}
            <div className="hidden lg:block bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden relative">
              {/* Header / Info bar inside the page */}
              <div className="bg-slate-50/85 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h1 className="text-sm font-black uppercase tracking-wider text-slate-800">SMS Sender</h1>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Nueotel SMS Gateway
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIframeLoading(true);
                      const iframe = document.getElementById("sms-iframe") as HTMLIFrameElement;
                      if (iframe) iframe.src = "https://app.nueotel.com/auth/login#/auth/login";
                    }}
                    className="p-2 hover:bg-slate-200/50 active:scale-95 transition-all rounded-xl text-slate-500 hover:text-slate-700"
                    title="Reload Portal"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <a
                    href="https://app.nueotel.com/auth/login#/auth/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-slate-200/50 active:scale-95 transition-all rounded-xl text-slate-500 hover:text-slate-700"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Iframe container */}
              <div className="w-full relative bg-slate-50 h-[70vh] md:h-[76vh]">
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10 animate-fade-in">
                    <div className="flex flex-col items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <Loader2 className="w-8 h-8 animate-spin text-devo-600" />
                      Connecting to SMS Gateway...
                    </div>
                  </div>
                )}
                <iframe
                  id="sms-iframe"
                  src="https://app.nueotel.com/auth/login#/auth/login"
                  className="w-full h-full border-none"
                  onLoad={() => setIframeLoading(false)}
                  allow="geolocation; microphone; camera"
                />
              </div>
            </div>

            {/* ─── MOBILE/TABLET VIEW FALLBACK (Laptop View Only Warning) ─── */}
            <div className="block lg:hidden bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 text-center max-w-md mx-auto space-y-6 mt-12">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <Monitor className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-devo-950 uppercase tracking-tight">Laptop View Required</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                The SMS Sender platform requires a larger viewport for proper functionality and layout configuration.
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Please log in from a laptop or desktop computer to access this tool.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
