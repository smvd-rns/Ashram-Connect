"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import { LogOut, Settings, Radio } from "lucide-react";
import ProfileEdit from "./ProfileEdit";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const { profile, refreshProfile } = useProfile(session);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New imports for mobile bar
  const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return session?.user?.email?.[0].toUpperCase() || "U";
  };

  return (
    <>
      {/* ─── DESKTOP NAVBAR (Top) ─────────────────────────── */}
      <nav className="hidden md:flex justify-between items-center h-20 bg-white/90 backdrop-blur-lg sticky top-0 z-[100] border-b border-devo-100/50 shadow-sm px-8">
        <NextLink href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-devo-500 to-orange-400 flex items-center justify-center text-white font-outfit font-bold shadow-md group-hover:shadow-lg transition-all group-hover:scale-110">
            SE
          </div>
          <span className="font-outfit text-xl font-bold text-devo-950 tracking-tight">
            Spiritual Echoes
          </span>
        </NextLink>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-devo-200 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-devo-100 flex items-center justify-center text-devo-600 font-black text-xs group-hover:bg-devo-600 group-hover:text-white transition-colors">
              {getInitials()}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-devo-900">My Profile</span>
          </button>

          <NextLink 
            href="/portal" 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white transition-all group shadow-sm hover:shadow-orange-200"
          >
            <div className="flex items-center justify-center relative">
               <Radio className="w-5 h-5" />
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Online Portal</span>
          </NextLink>

          {profile?.role === 1 && (
            <NextLink 
              href="/admin" 
              className="text-[10px] font-black uppercase tracking-widest text-devo-700 hover:text-white hover:bg-devo-600 px-4 py-2.5 rounded-xl transition-all border border-devo-100/50 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" /> <span>Admin Panel</span>
            </NextLink>
          )}

          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            className="p-3 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* ─── MOBILE TOP HEADER (Fixed) ────────────────── */}
      <nav className="md:hidden fixed top-0 left-0 right-0 h-16 z-[100] bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between">
        <NextLink href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-devo-500 to-orange-400 flex items-center justify-center text-white font-outfit font-black text-[10px] shadow-sm">
            SE
          </div>
          <span className="font-outfit text-sm font-bold text-devo-950 tracking-tight">
            Spiritual Echoes
          </span>
        </NextLink>

        <div className="flex items-center gap-2">
          {profile?.role === 1 && (
            <NextLink href="/admin" className="p-2 text-slate-400 hover:text-devo-600 active:scale-95 transition-all">
              <Settings className="w-5 h-5" />
            </NextLink>
          )}
          <button 
            onClick={() => setShowProfileModal(true)}
            className="w-9 h-9 rounded-full bg-devo-100 border-2 border-white shadow-sm flex items-center justify-center text-devo-700 font-black text-[10px] active:scale-90 transition-all overflow-hidden"
          >
            {getInitials()}
          </button>
        </div>
      </nav>

      {/* ─── MOBILE TAB BAR (Bottom) ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-6 py-3 flex items-center justify-center gap-20 safe-area-bottom">
        <NextLink href="/" className="flex flex-col items-center gap-1 group">
          <div className="p-2 rounded-xl group-active:scale-95 transition-all text-slate-400">
            <HomeIcon /> 
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Home</span>
        </NextLink>

        <NextLink href="/portal" className="flex flex-col items-center gap-1 group relative">
          <div className="p-2 bg-devo-50 text-devo-600 rounded-xl group-active:scale-95 transition-all shadow-inner">
             <Radio className="w-6 h-6" />
             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-devo-600">Live</span>
        </NextLink>
      </nav>

      {showProfileModal && (
        <ProfileEdit 
          session={session} 
          profile={profile} 
          onUpdate={refreshProfile} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </>
  );
}
