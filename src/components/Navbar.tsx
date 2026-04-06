"use client";

import { useState, useEffect } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Monitor, UserCheck, CalendarDays } from "lucide-react";
import ProfileEdit from "./ProfileEdit";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export default function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const { profile, isBcdb, refreshProfile } = useProfile(session);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New imports for mobile bar
  const HomeIcon = ({ active }: { active?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
  
  const Youtube = ({ className, active }: { className?: string, active?: boolean }) => (
    <svg 
      viewBox="0 0 24 24" 
      fill={active ? "currentColor" : "none"} 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={`lucide lucide-youtube ${className}`}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z" />
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill={active ? "white" : "none"} />
    </svg>
  );

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

  const isHome = pathname === "/";
  const isClass = pathname === "/class";
  const isAttendance = pathname === "/attendance";

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
            href="/class" 
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all group shadow-sm ${isClass ? 'bg-orange-600 text-white border-orange-600 shadow-orange-200' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-600 hover:text-white'}`}
          >
            <div className="flex items-center justify-center relative">
               <Youtube className="w-5 h-5" active={isClass} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Brahmachari Class</span>
          </NextLink>
          
          {isBcdb && (
            <NextLink 
              href="/attendance" 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all group shadow-sm ${isAttendance ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white'}`}
            >
              <div className="flex items-center justify-center relative">
                 <CalendarDays className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">My Attendance</span>
            </NextLink>
          )}

          {profile?.role === 1 && (
            <NextLink 
              href="/admin" 
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all border flex items-center gap-2 ${pathname.startsWith('/admin') ? 'bg-devo-600 text-white border-devo-600' : 'text-devo-700 hover:text-white hover:bg-devo-600 border-devo-100/50'}`}
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

      {/* ─── MOBILE TOP HEADER (Scrollable) ────────────────── */}
      <nav className="md:hidden relative h-16 z-[100] bg-white border-b border-slate-100 px-4 flex items-center justify-between">
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
            <NextLink href="/admin" className={`p-2 active:scale-95 transition-all ${pathname.startsWith('/admin') ? 'text-devo-600' : 'text-slate-400 hover:text-devo-600'}`}>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center justify-between gap-1 safe-area-bottom">
        <NextLink href="/" className="flex flex-col items-center gap-1 group flex-1">
          <div className={`p-2 rounded-xl group-active:scale-95 transition-all ${isHome ? 'bg-devo-50 text-devo-600 shadow-inner' : 'text-slate-400'}`}>
            <HomeIcon active={isHome} /> 
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isHome ? 'text-devo-600' : 'text-slate-400'}`}>Home</span>
        </NextLink>
        <NextLink href="/class" className="flex flex-col items-center gap-1 group flex-1">
          <div className={`p-2 rounded-xl group-active:scale-95 transition-all ${isClass ? 'bg-devo-50 text-devo-600 shadow-inner' : 'text-slate-400'}`}>
             <Youtube className="w-6 h-6" active={isClass} />
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${isClass ? 'text-devo-600' : 'text-slate-400'}`}>Brahmachari Class</span>
        </NextLink>

        {isBcdb && (
          <NextLink href="/attendance" className="flex flex-col items-center gap-1 group flex-1">
            <div className={`p-2 rounded-xl group-active:scale-95 transition-all ${isAttendance ? 'bg-devo-50 text-devo-600 shadow-inner' : 'text-slate-400'}`}>
               <CalendarDays className="w-6 h-6" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isAttendance ? 'text-devo-600' : 'text-slate-400'}`}>Attendance</span>
          </NextLink>
        )}

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
