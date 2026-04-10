"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, FileText, ChevronRight, Loader2, 
  ShieldCheck, AlertCircle, MapPin, Search,
  ArrowUpRight, CalendarDays
} from "lucide-react";
import PolicyDocumentModal from "./PolicyDocumentModal";

interface Policy {
  id: string;
  title: string;
  drive_url: string;
  created_at: string;
}

interface PolicyManualViewProps {
  isEligible: boolean;
  email: string | null;
}

export default function PolicyManualView({ isEligible, email }: PolicyManualViewProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isEligible) {
      setLoading(false);
      return;
    }

    async function fetchPolicies() {
      try {
        const res = await fetch("/api/policies");
        const data = await res.json();
        if (res.ok) {
          setPolicies(data.data || []);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError("Failed to fetch policies");
      } finally {
        setLoading(false);
      }
    }

    fetchPolicies();
  }, [isEligible]);

  if (!isEligible) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-rose-100">
           <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight font-outfit uppercase">Access Restricted</h2>
        <p className="text-slate-400 mt-2 max-w-sm font-medium leading-relaxed">
          The Policy Manual is only available to officially registered Ashram members.
        </p>
        {email && (
          <div className="mt-6 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Verified: {email}
          </div>
        )}
      </div>
    );
  }

  const filteredPolicies = policies.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardStyles = [
    { bg: "bg-indigo-50/50", border: "border-indigo-100", icon: "text-indigo-600", iconBg: "bg-indigo-100", glow: "bg-indigo-400", hover: "hover:border-indigo-300 hover:shadow-indigo-100" },
    { bg: "bg-emerald-50/50", border: "border-emerald-100", icon: "text-emerald-600", iconBg: "bg-emerald-100", glow: "bg-emerald-400", hover: "hover:border-emerald-300 hover:shadow-emerald-100" },
    { bg: "bg-amber-50/50", border: "border-amber-100", icon: "text-amber-600", iconBg: "bg-amber-100", glow: "bg-amber-400", hover: "hover:border-amber-300 hover:shadow-amber-100" },
    { bg: "bg-rose-50/50", border: "border-rose-100", icon: "text-rose-600", iconBg: "bg-rose-100", glow: "bg-rose-400", hover: "hover:border-rose-300 hover:shadow-rose-100" },
    { bg: "bg-violet-50/50", border: "border-violet-100", icon: "text-violet-600", iconBg: "bg-violet-100", glow: "bg-violet-400", hover: "hover:border-violet-300 hover:shadow-violet-100" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-in fade-in duration-700">
      
      {/* Compact Hero Header */}
      <div className="mb-12 relative overflow-hidden bg-gradient-to-br from-slate-900 via-devo-950 to-slate-900 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 text-white shadow-xl border border-white/5">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-devo-500/10 rounded-full -mr-[200px] -mt-[200px] blur-[100px]" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-3">
                 <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <BookOpen className="w-5 h-5 text-devo-300" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-devo-300 opacity-60">Ashram Compliance</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter font-outfit leading-none">Policy <span className="text-devo-400">Manual</span></h1>
              <p className="text-devo-100 font-bold max-w-lg text-sm opacity-70 leading-relaxed font-outfit">
                Standardized guidelines and protocols for spiritual and administrative excellence.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10 shadow-lg">
               <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
               </div>
               <div className="min-w-0">
                  <div className="text-sm font-black tracking-tight font-outfit uppercase">Authorized</div>
                  <div className="text-[9px] font-black text-devo-300 opacity-50 uppercase tracking-widest truncate mt-0.5">{email}</div>
               </div>
            </div>
         </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row gap-8 mb-16 px-2">
         <div className="flex-1 relative group">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-focus-within:text-devo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search documents by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] outline-none focus:border-devo-500 focus:ring-[12px] focus:ring-devo-50 transition-all font-bold text-slate-700 shadow-xl shadow-slate-200/40 text-lg"
            />
         </div>
         <div className="flex items-center gap-6 bg-white border border-slate-100 px-10 py-6 rounded-[2.5rem] sm:w-auto w-full shadow-lg shadow-slate-100/50">
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Documents</span>
               <div className="text-4xl font-black text-devo-950 font-outfit leading-none">{filteredPolicies.length}</div>
            </div>
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
           {[1,2,3,4].map(i => (
             <div key={i} className="h-48 sm:h-72 bg-slate-100 animate-pulse rounded-[1.5rem] sm:rounded-[3rem]" />
           ))}
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="py-20 sm:py-32 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] sm:rounded-[4rem]">
           <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-slate-200" />
           </div>
           <p className="text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-sm italic px-4">No matching protocols found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
          {filteredPolicies.map((policy, index) => {
            const style = cardStyles[index % cardStyles.length];
            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(policy)}
                className={`group relative flex flex-col p-5 sm:p-10 ${style.bg} border-2 ${style.border} rounded-[1.5rem] sm:rounded-[3rem] text-left transition-all hover:bg-white hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 sm:hover:-translate-y-4 overflow-hidden ${style.hover}`}
              >
                {/* Decorative Corner Glow */}
                <div className={`absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 sm:w-48 sm:h-48 ${style.glow} opacity-0 group-hover:opacity-10 blur-[60px] sm:blur-[80px] transition-opacity rounded-full`} />
                
                <div className={`mb-4 sm:mb-10 w-10 h-10 sm:w-16 sm:h-16 ${style.iconBg} rounded-xl sm:rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                  <FileText className={`w-5 h-5 sm:w-8 sm:h-8 ${style.icon}`} />
                </div>
                
                <div className="flex-1 space-y-1.5 sm:space-y-3 relative z-10">
                  <h3 className="text-xs sm:text-2xl font-black text-slate-900 tracking-tight leading-tight font-outfit group-hover:text-devo-900 transition-colors uppercase line-clamp-3">
                    {policy.title}
                  </h3>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                     <CalendarDays className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-300" />
                     <p className="text-[8px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">
                       {new Date(policy.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                     </p>
                  </div>
                </div>

                <div className="mt-6 sm:mt-12 flex items-center justify-between relative z-10">
                  <span className={`text-[9px] sm:text-[11px] font-black ${style.icon} uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0 hidden sm:block`}>
                    View
                  </span>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-white border border-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-all group-hover:rotate-[360deg] duration-700 shadow-sm ml-auto sm:ml-0">
                     <ArrowUpRight className="w-4 h-4 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Integration */}
      {selectedPolicy && (
        <PolicyDocumentModal
          isOpen={!!selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          title={selectedPolicy.title}
          driveUrl={selectedPolicy.drive_url}
        />
      )}
    </div>
  );
}
