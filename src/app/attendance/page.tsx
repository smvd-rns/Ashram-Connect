"use client";

import React, { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import Navbar from "@/components/Navbar";
import AttendanceTracing from "@/components/AttendanceTracing";
import { Loader2, ShieldAlert, LogIn, ArrowRight } from "lucide-react";

export default function PersonalAttendancePage() {
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { profile, isBcdb, loading: loadingProfile } = useProfile(session);

  if (initializing || (session && loadingProfile)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-slate-600 font-black uppercase tracking-widest text-[10px] animate-pulse">Establishing Secure Connection...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8 border border-slate-100">
          <LogIn className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Secure Portal</h1>
        <p className="text-slate-500 font-bold max-w-sm mb-8">Please sign in to access your personal attendance records.</p>
        <button
          onClick={() => window.location.href = "/"}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95"
        >
          Sign In Now <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!isBcdb) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center pt-24">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] shadow-xl flex items-center justify-center mb-8 border border-rose-100">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Access Restricted</h1>
          <p className="text-slate-500 font-bold max-w-md mb-8">This portal is specifically reserved for active members of the BCDB. If you believe this is an error, please contact your administrative temple in-charge.</p>
          <button
            onClick={() => window.location.href = "/"}
            className="text-slate-400 font-black uppercase tracking-widest text-xs hover:text-indigo-600 transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">My Attendance</h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Official BCDB Record
            </p>
          </div>
          <Suspense fallback={<div className="p-20 text-center font-black text-slate-200 uppercase tracking-widest">Loading Records...</div>}>
            <AttendanceTracing
              isAdmin={profile?.role === 1}
              forceUserView={true}
              session={session}
              profile={profile}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
