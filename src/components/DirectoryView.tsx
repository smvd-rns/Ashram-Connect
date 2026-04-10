"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Phone, Mail, MapPin, User, 
  ArrowUpRight, Loader2, Users, ShieldCheck,
  ChevronRight, Filter, Copy
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

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copyType, setCopyType] = useState<'all' | 'email' | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchDevotees();
  }, []);

  const handleCopy = (devotee: Devotee, index: number, type: 'all' | 'email' = 'all') => {
    let text = "";
    if (type === 'all') {
      text = `${devotee.initiated_name || devotee.legal_name}\n📞 ${devotee.contact_no}\n📧 ${devotee.email_id}`;
    } else {
      text = devotee.email_id;
    }
    
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setCopyType(type);
    setTimeout(() => {
      setCopiedIndex(null);
      setCopyType(null);
    }, 2000);
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    if (!name) return "bg-slate-100 text-slate-400 border-slate-200";
    const colors = [
      "bg-emerald-500 text-white border-emerald-400",
      "bg-indigo-500 text-white border-indigo-400",
      "bg-rose-500 text-white border-rose-400",
      "bg-amber-500 text-white border-amber-400",
      "bg-violet-500 text-white border-violet-400",
      "bg-cyan-500 text-white border-cyan-400",
      "bg-blue-500 text-white border-blue-400",
      "bg-orange-500 text-white border-orange-400"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

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
        <div className={viewMode === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" : "space-y-4"}>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredDevotees.map((devotee, index) => (
            <div 
              key={index} 
              className="group relative flex flex-col bg-white border-2 border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] text-left transition-all hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-2 overflow-hidden shadow-sm"
            >
              {/* Profile Photo Area */}
              <div className="relative h-40 sm:h-56 bg-slate-50 overflow-hidden">
                {devotee.photo_url && !imgErrors[index] ? (
                  <img 
                    src={getGoogleThumbnail(devotee.photo_url) || ""} 
                    alt={devotee.initiated_name || devotee.legal_name}
                    onError={() => setImgErrors(prev => ({ ...prev, [index]: true }))}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-4xl sm:text-6xl font-black font-outfit shadow-inner border-b-4 ${getAvatarColor(devotee.initiated_name || devotee.legal_name)}`}>
                    {getInitials(devotee.initiated_name || devotee.legal_name)}
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
              <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                <div className="min-w-0 flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs sm:text-base font-black text-slate-900 tracking-tight leading-[1.3] font-outfit uppercase group-hover:text-emerald-700 transition-colors break-words">
                      {devotee.initiated_name || devotee.legal_name}
                    </h3>
                    {devotee.initiated_name && devotee.legal_name && (
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                        {devotee.legal_name}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => handleCopy(devotee, index, 'all')}
                    className={`shrink-0 p-2 rounded-lg transition-all active:scale-90 ${copiedIndex === index && copyType === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    title="Copy Profile"
                  >
                    {copiedIndex === index && copyType === 'all' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="space-y-2">
                   <a 
                     href={`tel:${devotee.contact_no}`}
                     className="flex items-center gap-2.5 text-slate-600 hover:text-emerald-600 transition-colors group/link"
                   >
                      <Phone className="w-3.5 h-3.5 text-slate-300 group-hover/link:text-emerald-400" />
                      <span className="text-[10px] sm:text-xs font-black tracking-tight">{devotee.contact_no}</span>
                   </a>
                   <div className="flex items-center justify-between group/mail">
                      <div className="flex items-center gap-2.5 text-slate-600 min-w-0">
                        <Mail className="w-3.5 h-3.5 text-slate-300 group-hover/mail:text-emerald-400" />
                        <span className="text-[10px] sm:text-xs font-bold truncate opacity-80">{devotee.email_id}</span>
                      </div>
                      <button 
                        onClick={() => handleCopy(devotee, index, 'email')}
                        className={`ml-1 p-1 rounded transition-all ${copiedIndex === index && copyType === 'email' ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-500'}`}
                      >
                         {copiedIndex === index && copyType === 'email' ? <ShieldCheck className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                      </button>
                   </div>
                </div>

                <div className="pt-1">
                   <a 
                     href={`tel:${devotee.contact_no}`}
                     className="w-full py-2 sm:py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 group/btn border border-emerald-100"
                   >
                      Call Devotee
                      <ChevronRight className="w-3 h-3 sm:w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                   </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode View (Refined) */
        <div className="flex flex-col gap-3">
           {filteredDevotees.map((devotee, index) => (
             <div 
               key={index}
               className="bg-white p-4 sm:p-5 rounded-[1.8rem] border-2 border-slate-100 flex items-center gap-4 sm:gap-6 hover:border-emerald-200 transition-all group shadow-sm"
             >
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-50 shrink-0 shadow-inner ring-4 ring-slate-50 transition-all group-hover:ring-emerald-50">
                  {devotee.photo_url && !imgErrors[index] ? (
                    <img 
                      src={getGoogleThumbnail(devotee.photo_url) || ""} 
                      alt={devotee.initiated_name}
                      onError={() => setImgErrors(prev => ({ ...prev, [index]: true }))}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-xl sm:text-3xl font-black font-outfit shadow-inner ${getAvatarColor(devotee.initiated_name || devotee.legal_name)}`}>
                      {getInitials(devotee.initiated_name || devotee.legal_name)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
                   <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
                       {/* Top: Name and Center */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-xl font-black text-slate-900 font-outfit truncate uppercase leading-none">
                          {devotee.initiated_name || devotee.legal_name}
                        </h3>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100 shrink-0">
                            <MapPin className="w-2.5 h-2.5 text-emerald-600" />
                            <span className="text-[8px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">{devotee.center || 'Gen'}</span>
                        </div>
                      </div>

                      {/* Middle: Data Section (Red Marked area fix) */}
                      <div className="flex flex-col gap-1.5">
                         <div className="flex items-center gap-2 min-w-0 group/mail">
                            <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0 transition-colors group-hover/mail:text-emerald-400" />
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]">{devotee.email_id}</span>
                            <button 
                              onClick={() => handleCopy(devotee, index, 'email')}
                              className={`p-1 rounded transition-all active:scale-90 ${copiedIndex === index && copyType === 'email' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500'}`}
                            >
                               {copiedIndex === index && copyType === 'email' ? <ShieldCheck className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 rotate-90" />}
                            </button>
                         </div>
                         <div className="flex items-center gap-2 group/phone">
                            <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0 transition-colors group-hover/phone:text-emerald-400" />
                            <span className="text-[10px] font-black text-slate-500 tracking-tight">{devotee.contact_no}</span>
                         </div>
                      </div>
                   </div>

                   {/* Right: Actions */}
                   <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 shrink-0">
                      <div className="flex flex-row sm:flex-col gap-2 items-center">
                         <button 
                           onClick={() => handleCopy(devotee, index, 'all')}
                           className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all active:scale-90 ${copiedIndex === index && copyType === 'all' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shadow-sm'}`}
                           title="Copy contact"
                         >
                            {copiedIndex === index && copyType === 'all' ? <ShieldCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                         </button>
                         <a 
                           href={`tel:${devotee.contact_no}`}
                           className="w-10 h-10 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/10 group/call"
                         >
                            <Phone className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover/call:rotate-[20deg]" />
                         </a>
                      </div>
                      <div className="hidden sm:block text-right">
                         <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Status</div>
                         <div className="text-[10px] font-black text-emerald-500 mt-1 uppercase tracking-tight leading-none bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">Active</div>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
