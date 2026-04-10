"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Plane, Calendar, Mail, User, MapPin, 
  MessageSquare, Users, Send, CheckCircle, 
  Loader2, ArrowRight, ShieldCheck, ChevronDown, 
  ChevronUp, Plus, Clock, Briefcase, Info, X
} from "lucide-react";

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

interface TravelFormProps {
  session: any;
  profile: any;
}

export default function TravelForm({ session, profile }: TravelFormProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    email_id: "",
    devotee_name: "",
    departure_date: "",
    return_date: "",
    places_of_travel: "",
    purpose_of_travel: "",
    accompanying_bcari: "",
    counselor_email: ""
  });

  const [submissions, setSubmissions] = useState<TravelSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/travel-desk", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.data) setSubmissions(result.data);
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session.access_token]);

  useEffect(() => {
    const prefillData = async () => {
      if (!session?.user?.email) return;
      
      try {
        const res = await fetch(`/api/auth/bcdb-details?email=${encodeURIComponent(session.user.email)}`);
        const result = await res.json();
        
        if (result.data) {
          const bcdb = result.data;
          setFormData(prev => ({
            ...prev,
            email_id: bcdb.email_id || bcdb.email_address || session.user.email,
            devotee_name: bcdb.initiated_name || bcdb.legal_name || profile?.full_name || "",
            counselor_email: bcdb.counsellor || bcdb.custom_counsellor || ""
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            email_id: session.user.email,
            devotee_name: profile?.full_name || ""
          }));
        }
      } catch (err) {
        console.error("Prefill error:", err);
      } finally {
        setLoading(false);
      }
    };

    prefillData();
    fetchHistory();
  }, [session, profile, fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/travel-desk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      // ADD INSTANTLY TO HISTORY
      if (result.data) {
        setSubmissions(prev => [result.data, ...prev]);
      }

      setSuccess(true);
      setIsFormOpen(false); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        <p className="mt-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Preparing Desk...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-in fade-in duration-700">
      <div className="mb-12 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
         <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-[9px] uppercase tracking-widest mb-3 border border-emerald-100">
                <Plane className="w-3 h-3" /> Movement Logs
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter font-outfit uppercase leading-none">Travel <span className="text-emerald-500 text-outline">Desk</span></h1>
            <p className="text-slate-400 font-bold text-sm mt-3 opacity-70">Log and track your travel movement securely.</p>
         </div>
         
         {!isFormOpen && !success && (
           <button 
             onClick={() => setIsFormOpen(true)}
             className="px-8 py-5 bg-slate-900 hover:bg-emerald-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all flex items-center gap-3 active:scale-95 group"
           >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              New Travel Request
           </button>
         )}
      </div>

      {success && (
        <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-[2.5rem] p-8 sm:p-12 text-center mb-12 animate-in zoom-in-95 duration-500">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10 border border-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 tracking-tight font-outfit uppercase">Submission Saved</h2>
           <p className="text-slate-500 mt-2 font-bold max-w-sm mx-auto text-sm leading-relaxed">
             Your travel log has been saved. It is now visible in your history below.
           </p>
           <button 
             onClick={() => setSuccess(false)}
             className="mt-8 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:underline"
           >
              Dismiss Message
           </button>
        </div>
      )}

      {/* Collapsible Form */}
      {isFormOpen && (
        <div className="mb-16 animate-in slide-in-from-top-4 duration-500">
           <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-20"
              >
                 <X className="w-6 h-6" />
              </button>

              <form onSubmit={handleSubmit} className="relative z-10 space-y-6 sm:space-y-8">
                 {error && (
                   <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-bold text-xs">
                     {error}
                   </div>
                 )}
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Mail className="w-3 h-3" /> Email
                       </label>
                       <input type="email" readOnly value={formData.email_id} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-400 font-bold text-sm outline-none cursor-not-allowed" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" /> Devotee Name
                       </label>
                       <input type="text" readOnly value={formData.devotee_name} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-400 font-bold text-sm outline-none cursor-not-allowed" />
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Departure Date
                       </label>
                       <input type="date" required value={formData.departure_date} onChange={(e) => setFormData({...formData, departure_date: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-emerald-500 transition-all [color-scheme:light]" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" /> Expected Return
                       </label>
                       <input type="date" required value={formData.return_date} onChange={(e) => setFormData({...formData, return_date: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-emerald-500 transition-all [color-scheme:light]" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <MapPin className="w-3 h-3" /> Places of Travel
                    </label>
                    <input type="text" required value={formData.places_of_travel} onChange={(e) => setFormData({...formData, places_of_travel: e.target.value})} placeholder="Temples, centers, home..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <MessageSquare className="w-3 h-3" /> Purpose
                    </label>
                    <textarea rows={2} required value={formData.purpose_of_travel} onChange={(e) => setFormData({...formData, purpose_of_travel: e.target.value})} placeholder="Reason for travel..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-emerald-500 transition-all resize-none" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Users className="w-3 h-3" /> Accompanying Bcari
                       </label>
                       <input type="text" value={formData.accompanying_bcari} onChange={(e) => setFormData({...formData, accompanying_bcari: e.target.value})} placeholder="Names (if any)..." className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" /> Counselor Email
                       </label>
                       <input type="text" readOnly value={formData.counselor_email} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-400 font-bold text-sm outline-none cursor-not-allowed" />
                    </div>
                 </div>

                 <button 
                   type="submit" 
                   disabled={submitting} 
                   className="w-full py-5 sm:py-6 bg-emerald-600 hover:bg-slate-900 text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-3xl shadow-xl shadow-emerald-500/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                 >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Submit Log</>}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* User History Section */}
      <UserHistory logs={submissions} loading={historyLoading} />
    </div>
  );
}

function UserHistory({ logs, loading }: { logs: TravelSubmission[], loading: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return (
     <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
     </div>
  );

  if (logs.length === 0) return (
    <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
       <Info className="w-10 h-10 text-slate-100 mx-auto mb-4" />
       <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">No travel logs found</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
         <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">Your History</h2>
         <div className="h-px bg-slate-100 flex-1" />
         <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
            <Clock className="w-3 h-3" /> {logs.length} Entries
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {logs.map((log) => (
           <div 
             key={log.id} 
             onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
             className={`group bg-white rounded-3xl border-2 transition-all cursor-pointer overflow-hidden ${expandedId === log.id ? 'border-emerald-300 shadow-2xl shadow-emerald-500/5' : 'border-slate-100 hover:border-emerald-100'}`}
           >
              {/* Collapsed View */}
              <div className="p-5 sm:p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div className="flex items-center gap-5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${expandedId === log.id ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100'}`}>
                       <Plane className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                       <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase truncate font-outfit leading-none mb-1.5">{log.places_of_travel}</h3>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.departure_date).toLocaleDateString()} — {new Date(log.return_date).toLocaleDateString()}
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${log.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {log.status}
                    </div>
                    <div className="p-2 text-slate-300 group-hover:text-emerald-500 transition-colors">
                       {expandedId === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                 </div>
              </div>

              {/* Expanded Details */}
              {expandedId === log.id && (
                <div className="px-5 sm:px-7 pb-7 pt-4 border-t border-slate-50 bg-slate-50/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                             <Briefcase className="w-2.5 h-2.5" /> Purpose of Travel
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed italic">"{log.purpose_of_travel}"</p>
                       </div>
                       
                       <div className="space-y-1">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                             <Users className="w-2.5 h-2.5" /> Accompanying
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-600">{log.accompanying_bcari || "Traveling alone"}</p>
                       </div>

                       <div className="space-y-1 col-span-full pt-4 border-t border-slate-100">
                          <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                             <ShieldCheck className="w-2.5 h-2.5" /> Counselor Verification
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <p className="text-xs font-black text-slate-900">{log.counselor_email || 'General Review'}</p>
                          </div>
                       </div>
                    </div>
                </div>
              )}
           </div>
         ))}
      </div>
    </div>
  );
}

