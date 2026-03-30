"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import YouTubeChannelHub from "@/components/YouTubeChannelHub";
import AuthUI from "@/components/AuthUI";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

export default function PortalPage() {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Profile data
  const { profile, loading: loadingProfile } = useProfile(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loadingAuth || (session && loadingProfile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-devo-600" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 py-20 flex flex-col items-center">
        <AuthUI redirectTo="/portal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="py-6 sm:py-12">
        <YouTubeChannelHub />
      </main>
    </div>
  );
}
