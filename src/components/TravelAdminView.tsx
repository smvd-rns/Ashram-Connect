"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plane, Calendar, Mail, User, MapPin, 
  MessageSquare, Users, CheckCircle, 
  Loader2, Filter, Bell, Clock,
  ChevronRight, Search, Briefcase, ShieldCheck, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface TravelSubmission {
  id: string;
  email_id: string;
  devotee_name: string;
  departure_date: string;
  return_date: string;
  places_of_travel: string;
  purpose_of_travel: string;
  accompanying_bcari: string;
  counselor_email: string;
  status: 'Pending' | 'Processed' | 'Rejected';
  created_at: string;
}

interface TravelAdminViewProps {
  session: any;
  profile: any;
}

export default function TravelAdminView({ session, profile }: TravelAdminViewProps) {
  const [submissions, setSubmissions] = useState<TravelSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Processed'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Centralized Push Notifications
  const { pushEnabled, isSubscribing, subscribe: subscribeUser } = usePushNotifications(session);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await fetch("/api/travel-desk", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.data) setSubmissions(result.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    fetchSubmissions();

    // Realtime Subscription
    const channel = supabase
      .channel('travel_desk_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'travel_submissions' }, 
        (payload) => {
          const newSub = payload.new as TravelSubmission;
          setSubmissions(prev => [newSub, ...prev]);
          
          // Trigger Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Travel Request!", {
              body: `${newSub.devotee_name} has submitted a travel form.`,
              icon: "/favicon.ico"
            });
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'travel_submissions' },
        (payload) => {
           const updated = payload.new as TravelSubmission;
           setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubmissions]);

  const updateStatus = async (id: string, status: 'Pending' | 'Processed' | 'Rejected') => {
    try {
      const res = await fetch("/api/travel-desk", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, status })
      });
      
      if (!res.ok) throw new Error("Failed to update");
      
      // Update local state IMMEDIATELY for instant feedback
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch (err) {
      alert("Error updating status. Please check your connection.");
    }
  };

  const filtered = submissions.filter(s => {
    const matchesFilter = filter === 'All' || s.status === filter;
    const matchesSearch = s.devotee_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-700">
      
      {/* Manager Header */}
      <div className="mb-6 sm:mb-10 bg-slate-900 rounded-[1.5rem] sm:rounded-[2.5rem] p-6 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-white/5">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full -mr-[200px] -mt-[200px] blur-[100px]" />
         <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center sm:items-end md:items-center gap-6">
            <div className="space-y-1 sm:space-y-2 text-center sm:text-left">
               <div className="flex items-center justify-center sm:justify-start gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
                    <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-emerald-300 opacity-60">Manager Dashboard</span>
               </div>
               <h1 className="text-3xl sm:text-5xl font-black tracking-tighter font-outfit leading-none mt-2">Travel <span className="text-emerald-400">Desk</span></h1>
               <p className="text-slate-400 font-bold text-xs sm:text-sm max-w-lg mt-2 opacity-70">Review and manage movement logs for all devotees.</p>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4">
               <button 
                  onClick={subscribeUser}
                  disabled={pushEnabled || isSubscribing}
                  className={`flex flex-col items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border transition-all ${pushEnabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
               >
                  <Bell className={`w-4 h-4 sm:w-5 h-5 ${pushEnabled ? 'fill-emerald-400' : ''}`} />
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                     {isSubscribing ? 'Syncing...' : pushEnabled ? 'Push Active' : 'Enable Push'}
                  </span>
               </button>
               <div className="bg-white/5 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl border border-white/10 text-center">
                  <div className="text-[8px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Pending</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1 leading-none">
                    {submissions.filter(s => s.status === 'Pending').length}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Controls */}
      <div className="mb-6 sm:mb-8 flex flex-col lg:flex-row gap-4 lg:items-center">
         <div className="relative flex-1 group">
            <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search devotee or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 sm:pl-16 pr-6 py-4 sm:py-5 bg-white border-2 border-slate-100 rounded-[1.2rem] sm:rounded-2xl text-slate-900 font-bold text-xs sm:text-sm outline-none focus:border-emerald-500 transition-all shadow-xl shadow-slate-100/50"
            />
         </div>
         <div className="flex bg-white p-1 rounded-2xl border-2 border-slate-100 shadow-lg overflow-x-auto no-scrollbar">
            {(['All', 'Pending', 'Processed'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${filter === m ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {m}
              </button>
            ))}
         </div>
      </div>

      {/* Submission List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
           <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
           <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
           <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs italic">No requests matching criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {filtered.map((s) => (
            <div 
               key={s.id}
               className="group bg-white border-2 border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 hover:border-emerald-200 transition-all shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5"
             >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors shrink-0">
                         <User className="w-5 h-5 sm:w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                         <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-outfit uppercase truncate leading-none mb-1">
                            {s.devotee_name}
                         </h3>
                         <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase truncate">{s.email_id}</p>
                      </div>
                   </div>
                   <div className={`px-3 sm:px-4 py-1.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border self-end sm:self-center ${s.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {s.status}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Departure</div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                         <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                         {new Date(s.departure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                   </div>
                   <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Return Pool</div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                         <Clock className="w-3.5 h-3.5 text-indigo-500" />
                         {new Date(s.return_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                   </div>
                </div>

                <div className="space-y-4 mb-8">
                   <div className="flex items-start gap-4">
                      <MapPin className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                      <div className="min-w-0">
                         <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">Destination</div>
                         <p className="text-xs sm:text-sm font-bold text-slate-600">{s.places_of_travel}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <Briefcase className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                      <div className="min-w-0">
                         <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">Purpose</div>
                         <p className="text-xs sm:text-sm font-bold text-slate-600 italic leading-relaxed">"{s.purpose_of_travel}"</p>
                      </div>
                   </div>
                   {s.accompanying_bcari && (
                      <div className="flex items-start gap-4">
                        <Users className="w-4 h-4 text-amber-400 mt-1 shrink-0" />
                        <div className="min-w-0 text-xs sm:text-sm font-bold text-slate-600">
                           <span className="text-slate-400 font-black">Co-travelers:</span> {s.accompanying_bcari}
                        </div>
                      </div>
                   )}
                   <div className="flex items-start gap-4 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                         <div className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none mb-1">Counselor Approval Required</div>
                         <p className="text-[10px] font-bold text-emerald-800/60 truncate">{s.counselor_email || 'Not Assigned'}</p>
                      </div>
                   </div>
                </div>

                {s.status === 'Pending' && (
                   <button 
                     onClick={() => updateStatus(s.id, 'Processed')}
                     className="w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl shadow-slate-200"
                   >
                      <CheckCircle className="w-4 h-4" /> Mark as Processed
                   </button>
                )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
