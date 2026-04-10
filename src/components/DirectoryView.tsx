"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Phone, Mail, MapPin, User, 
  ArrowUpRight, Loader2, Users, ShieldCheck,
  ChevronRight, Filter
} from "lucide-react";

interface Devotee {
  legal_name: string;
  initiated_name: string;
  email_id: string;
  contact_no: string;
  center: string;
  photo_url: string;
}

export default function DirectoryView() {
  const [devotees, setDevotees] = useState<Devotee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchDevotees();
  }, []);

  const fetchDevotees = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/directory");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDevotees(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGoogleThumbnail = (url: string) => {
    if (!url) return null;
    const driveMatch = url.match(/(?:\/d\/|id=)([\w-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${driveMatch[1]}=w400-h400-p-k-no`;
    }
    return url;
  };

  const filteredDevotees = devotees.filter(d => {
    const searchStr = `${d.initiated_name} ${d.legal_name} ${d.center} ${d.email_id} ${d.contact_no}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight font-outfit">Security Restriction</h2>
        <p className="text-slate-500 mt-2 font-bold max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-700">
      
      {/* Compact Header */}
      <div className="mb-10 relative overflow-hidden bg-gradient-to-br from-slate-900 via-devo-950 to-slate-900 rounded-[2rem] p-6 sm:p-10 text-white shadow-xl border border-white/5">
         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full -mr-[150px] -mt-[150px] blur-[100px]" />
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-3">
                 <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10">
                    <Users className="w-5 h-5 text-emerald-400" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-300 opacity-60">BCDB Directory</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tighter font-outfit leading-none">Devotee <span className="text-emerald-400">Directory</span></h1>
              <p className="text-slate-300 font-bold max-w-lg text-sm opacity-70 leading-relaxed font-outfit">
                Search and connect with your fellow devotees across all centers.
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3">
               <div className="text-right hidden sm:block">
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Global Network</div>
                  <div className="text-xl font-black text-white mt-1 leading-none">{devotees.length || 0} Members</div>
               </div>
               <div className="h-8 w-px bg-white/10 hidden sm:block mx-2" />
               <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
               </div>
            </div>
         </div>
      </div>

      {/* Search Bar & View Toggle */}
      <div className="mb-10 sticky top-4 z-[50]">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="relative group flex-1">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, center, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] text-slate-900 font-bold font-outfit focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-xl shadow-slate-100/50"
            />
          </div>
          
          <div className="flex bg-white p-2 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 shadow-lg shadow-slate-100/50">
             <button 
               onClick={() => setViewMode('grid')}
               className={`flex-1 sm:flex-none px-6 py-3 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Grid</span>
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`flex-1 sm:flex-none px-6 py-3 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center gap-2 transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">List</span>
             </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" : "space-y-4"}>
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className={viewMode === 'grid' ? "h-64 sm:h-80 bg-slate-100 animate-pulse rounded-[1.5rem] sm:rounded-[2rem]" : "h-24 bg-slate-100 animate-pulse rounded-2xl"} />
           ))}
        </div>
      ) : filteredDevotees.length === 0 ? (
        <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] sm:rounded-[3rem]">
           <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Search className="w-8 h-8 text-slate-200" />
           </div>
           <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs sm:text-sm italic">No devotees found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredDevotees.map((devotee, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col bg-white border-2 border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] text-left transition-all hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-2 overflow-hidden"
            >
              {/* Profile Photo Area */}
              <div className="relative h-40 sm:h-56 bg-slate-50 overflow-hidden">
                {devotee.photo_url ? (
                  <img 
                    src={getGoogleThumbnail(devotee.photo_url) || ""} 
                    alt={devotee.initiated_name || devotee.legal_name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-200">
                    <User className="w-16 h-16 sm:w-20 sm:h-20" strokeWidth={1} />
                  </div>
                )}
                
                {/* Center Badge Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                   <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl border border-white/20 shadow-lg flex items-center gap-1.5 max-w-fit">
                      <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                      <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate">{devotee.center || 'General'}</span>
                   </div>
                </div>
              </div>

              {/* Info Area (Grid) */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-tight font-outfit truncate uppercase group-hover:text-emerald-700 transition-colors">
                    {devotee.initiated_name || devotee.legal_name}
                  </h3>
                  {devotee.initiated_name && devotee.legal_name && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                      {devotee.legal_name}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                   <a 
                     href={`tel:${devotee.contact_no}`}
                     className="flex items-center gap-2 group/link hover:text-emerald-600 transition-colors"
                   >
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover/link:bg-emerald-50 group-hover/link:border-emerald-100 transition-all">
                        <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 group-hover/link:text-emerald-600" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 group-hover/link:text-emerald-700 tracking-tight">{devotee.contact_no}</span>
                   </a>
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 truncate tracking-tight">{devotee.email_id}</span>
                   </div>
                </div>

                <div className="pt-2">
                   <a 
                     href={`tel:${devotee.contact_no}`}
                     className="w-full py-2 sm:py-3 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 group/btn"
                   >
                      Call Devotee
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 transition-transform group-hover/btn:translate-x-1" />
                   </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode View */
        <div className="flex flex-col gap-3">
           {filteredDevotees.map((devotee, index) => (
             <div 
               key={index}
               className="bg-white p-3 sm:p-5 rounded-2xl border-2 border-slate-100 flex items-center gap-4 sm:gap-6 hover:border-emerald-200 transition-all group"
             >
                <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-50 shrink-0 shadow-inner">
                  {devotee.photo_url ? (
                    <img 
                      src={getGoogleThumbnail(devotee.photo_url) || ""} 
                      alt={devotee.initiated_name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-300">
                      <User className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6">
                   <div className="min-w-0">
                      <h3 className="text-sm sm:text-xl font-black text-slate-900 font-outfit truncate uppercase leading-none">
                        {devotee.initiated_name || devotee.legal_name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 sm:mt-2">
                         <div className="flex items-center gap-1.5 group-hover:text-emerald-600 transition-colors">
                            <MapPin className="w-3 h-3 text-slate-300 group-hover:text-emerald-400" />
                            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-none">{devotee.center || 'General'}</span>
                         </div>
                         <div className="w-1 h-1 rounded-full bg-slate-200" />
                         <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 uppercase tracking-tight hidden sm:block truncate">{devotee.email_id}</span>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                         <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Contact No</div>
                         <div className="text-xs font-black text-slate-900 mt-1 uppercase tracking-tight leading-none group-hover:text-emerald-700">{devotee.contact_no}</div>
                      </div>
                      <a 
                        href={`tel:${devotee.contact_no}`}
                        className="w-10 h-10 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/10 group/call"
                      >
                         <Phone className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/call:rotate-[20deg]" />
                      </a>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
