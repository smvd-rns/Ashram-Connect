"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import AccessDenied from "./AccessDenied";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const { profile, loading: profileLoading } = useProfile(session);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      handleRedirect(session);
      if (session) recordUserVisit(session.user.id);
    });

    // 2. Auth State Sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
      handleRedirect(session);
      if (session) recordUserVisit(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [pathname]); // Re-check on path change

  async function recordUserVisit(userId: string) {
    try {
      // 1. Update Profile (Last Seen status)
      await supabase
        .from("profiles")
        .update({ last_visit_at: new Date().toISOString() })
        .eq("id", userId);
        
      // 2. Insert into Historical Daily Logs (Unique per User per Day)
      // Ensure "migration_user_visits.sql" has been run first!
      await supabase
        .from("user_visits")
        .upsert(
          { 
            user_id: userId, 
            visit_date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) 
          }, 
          { onConflict: 'user_id,visit_date' }
        );
    } catch (err) {
      console.error("Visit log failed:", err);
    }
  }

  function handleRedirect(currentSession: any) {
    const isPublicRoute = pathname === "/login" || pathname === "/auth/callback";
    
    if (!currentSession && !isPublicRoute) {
      router.push("/login");
    }
  }

  const isPublicRoute = pathname === "/login" || pathname === "/auth/callback";

  // 1. Loading States (Centralized)
  const isChecking = authLoading || (session && profileLoading);
  
  if (isChecking && !isPublicRoute) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-devo-600" />
      </div>
    );
  }

  // 2. RBAC Logic (Authorized User Check)
  if (session && profile && pathname.startsWith("/admin")) {
    if (profile.role !== 1) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
