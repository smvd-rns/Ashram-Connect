"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import AttendanceTracing from "@/components/AttendanceTracing";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AttendancePage() {
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
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
           <Link 
            href="/portal" 
            className="inline-flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-indigo-600 transition-all"
           >
             <ArrowLeft className="w-4 h-4" /> Back to Portal
           </Link>
        </div>
        <AttendanceTracing isAdmin={profile?.role === 1} session={session} profile={profile} />
      </main>
    </div>
  );
}
