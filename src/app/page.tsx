"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import LectureGrid from "@/components/LectureGrid";
import AuthUI from "@/components/AuthUI";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [lectures, setLectures] = useState<any[]>([]);
  const searchTimeoutRef = useRef<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const pageSize = 20;

  // Profile data & completion form state
  const { profile, loading: loadingProfile, refreshProfile } = useProfile(session);
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regTemple, setRegTemple] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState("");

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

  useEffect(() => {
    if (session && profile?.full_name) {
      // Initial fetch or search reset
      fetchLectures(0, true);
    }
  }, [session, profile?.full_name]);

  const handleProfileComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegError("");
    try {
      const response = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ full_name: regName, mobile: regMobile, temple: regTemple })
      });
      if (!response.ok) throw new Error("Failed to update profile");
      await refreshProfile();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLectures = async (pageNum: number = 0, isInitial: boolean = false, searchQuery: string = "") => {
    try {
      if (!isInitial) setIsFetchingMore(true);
      
      const start = pageNum * pageSize;
      const end = start + pageSize - 1;

      let query = supabase
        .from("lectures")
        .select("*", { count: "exact" })
        .order("date", { ascending: false })
        .range(start, end);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,speaker_name.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query;
      
      if (error) throw error;

      if (isInitial) {
        setLectures(data || []);
        setPage(0);
      } else {
        setLectures(prev => [...prev, ...(data || [])]);
        setPage(pageNum);
      }

      // Check if more items exist
      if (count !== null) {
        setHasMore(start + (data?.length || 0) < count);
      } else {
        setHasMore((data?.length || 0) === pageSize);
      }

    } catch (err) {
      console.error("Failed to fetch lectures:", err);
    } finally {
      setLoadingAuth(false);
      setIsFetchingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore) {
      fetchLectures(page + 1, false);
    }
  };

  const handleSearch = (q: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    // Basic debounce to avoid spamming the DB
    searchTimeoutRef.current = setTimeout(() => {
      fetchLectures(0, true, q);
    }, 500);
  };

  if (loadingAuth || (session && loadingProfile)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 animate-spin text-devo-600" />
      </div>
    );
  }

  // Profile Completion Step
  const isProfileComplete = profile?.full_name && profile?.mobile && profile?.temple;
  if (!isProfileComplete) {
    return (
      <div className="max-w-xl mx-auto mt-10 sm:mt-20 px-4 mb-20">
        <div className="bg-white/80 backdrop-blur-2xl p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(249,115,22,0.15)] border border-white ring-1 ring-slate-200 space-y-6 sm:space-y-8 animate-in zoom-in duration-300">
           <div className="text-center">
             <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-100">
               <UserPlus className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
             </div>
             <h2 className="text-2xl sm:text-3xl font-outfit font-black text-slate-900 tracking-tight">Finish Registration</h2>
             <p className="text-slate-400 mt-2 font-medium text-sm sm:text-base">Almost there! We need a few more details.</p>
           </div>

           <form onSubmit={handleProfileComplete} className="space-y-4 sm:space-y-6">
              {regError && <div className="p-4 bg-red-50 text-red-700 text-sm rounded-2xl flex items-center border border-red-100 animate-shake"><AlertCircle className="w-5 h-5 mr-3 shrink-0" />{regError}</div>}
              
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div className="space-y-1">
                  <input type="text" required placeholder="Your Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-50 outline-none transition-all font-bold text-base sm:text-lg text-slate-800 placeholder:text-slate-300 hover:border-slate-300" />
                </div>
                <div className="space-y-1">
                  <input type="tel" required placeholder="Mobile Number" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-50 outline-none transition-all font-bold text-base sm:text-lg text-slate-800 placeholder:text-slate-300 hover:border-slate-300" />
                </div>
                <div className="space-y-1">
                  <input type="text" required placeholder="Temple / Center Name" value={regTemple} onChange={(e) => setRegTemple(e.target.value)} className="w-full px-6 py-4 sm:px-8 sm:py-5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-2xl focus:border-orange-400 focus:ring-4 focus:ring-orange-50 outline-none transition-all font-bold text-base sm:text-lg text-slate-800 placeholder:text-slate-300 hover:border-slate-300" />
                </div>
              </div>

              <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold py-5 rounded-2xl transition-all shadow-xl shadow-orange-100 active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-3 text-lg sm:text-xl">
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Complete My Registration"}
              </button>
           </form>
           <button 
             onClick={async () => {
               await supabase.auth.signOut();
               window.location.href = "/";
             }} 
             className="w-full text-center text-slate-300 font-bold hover:text-red-500 transition-colors uppercase tracking-[0.2em] text-[10px]"
           >
             Cancel & Logout
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="pt-12">
        <LectureGrid 
          initialLectures={lectures} 
          userRole={profile?.role}
          onUpdate={() => fetchLectures(0, true)}
          accessToken={session?.access_token}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isFetchingMore={isFetchingMore}
          onSearch={handleSearch}
        />
      </div>
    </div>
  );
}
