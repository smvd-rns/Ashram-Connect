"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, Filter, Calendar, Users, HardDrive, 
  ChevronLeft, ChevronRight, Download, CheckCircle2, XCircle, 
  Clock, AlertCircle, Search, Monitor, Settings, ArrowRightLeft,
  UserCheck, Plus, Trash2
} from "lucide-react";

interface AttendanceTracingProps {
  isAdmin?: boolean;
  session: any;
  profile: any;
}

export default function AttendanceTracing({ isAdmin = false, session, profile }: AttendanceTracingProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  
  // Filtering State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Session Slider State
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // View Modes: "matrix" (Users x Machines for 1 Day), "history" (Dates x sessions for 1 User), or "config" (Admin session setup)
  const [viewMode, setViewMode] = useState<"matrix" | "history" | "config">(isAdmin ? "matrix" : "history");
  const [selectedUserEmail, setSelectedUserEmail] = useState(isAdmin ? "" : profile?.email);

  // Machine Management State
  const [isAdding, setIsAdding] = useState(false);
  const [newMachine, setNewMachine] = useState({
    serial_number: "",
    description: "",
    ingestion_start: "02:00", 
    ingestion_end: "11:00",
    p_start: "04:00",
    p_end: "04:15",
    l_start: "04:15",
    l_end: "05:30"
  });

  const sessionIcons: Record<string, any> = {
    "Mangal Aarti": { icon: Clock, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", gradient: "from-orange-500 to-amber-600" },
    "SB Class": { icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", gradient: "from-indigo-500 to-purple-600" },
    "BC Class": { icon: Monitor, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", gradient: "from-purple-500 to-indigo-600" },
    "Hari Nam": { icon: Users, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", gradient: "from-rose-500 to-pink-600" },
    "Afternoon Session": { icon: Settings, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", gradient: "from-amber-500 to-orange-600" },
    "default": { icon: HardDrive, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", gradient: "from-slate-500 to-slate-700" }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, session]);

  const fetchReport = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/report?startDate=${startDate}&endDate=${endDate}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
      if (data.machines) {
        setMachines(data.machines);
        if (!selectedMachineId && data.machines.length > 0) {
          setSelectedMachineId(data.machines[0].id);
        }
      }
    } catch (err) {
      console.error("Report fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (logs: any[], machine: any) => {
    if (!logs || logs.length === 0) return "absent";
    
    // Convert check_time to time string HH:mm:ss
    const checkTime = new Date(logs[0].check_time).toLocaleTimeString('en-GB', { hour12: false });
    
    // P (Present): p_start <= checkTime <= p_end
    if (checkTime >= machine.p_start && checkTime <= machine.p_end) {
      return "present";
    }
    
    // L (Late): l_start <= checkTime <= l_end
    if (checkTime >= machine.l_start && checkTime <= machine.l_end) {
      return "late";
    }
    
    return "absent";
  };

  // Filtered Data Logic
  const filteredUsers = report.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayUser = report.find(u => u.email === selectedUserEmail) || report[0];
  const activeMachine = machines.find(m => m.id === selectedMachineId);

  const handleUpdateMachine = async (id: string, updates: any) => {
    try {
      await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'update_machine', data: { id, ...updates } })
      });
      fetchReport(); // Refresh
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleAddMachine = async () => {
    if (!newMachine.serial_number || !newMachine.description) {
      alert("Serial Number and Session Name are required.");
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'add_machine', data: newMachine })
      });
      setIsAdding(false);
      setNewMachine({
        serial_number: "",
        description: "",
        ingestion_start: "02:00", 
        ingestion_end: "11:00",
        p_start: "04:00",
        p_end: "04:15",
        l_start: "04:15",
        l_end: "05:30"
      });
      fetchReport();
    } catch (err) {
      console.error("Add failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session configuration? This will NOT delete attendance logs but will remove the session mapping.")) return;
    try {
      await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: 'delete_machine', data: { id } })
      });
      fetchReport();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Controls */}
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-[0_24px_48px_-12px_rgba(30,41,59,0.08)] border border-slate-200 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-100">
             <Monitor className="w-9 h-9 text-white" />
           </div>
           <div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight font-outfit uppercase sm:normal-case">Attendance Hub</h2>
             <p className="text-slate-400 font-bold flex items-center gap-2 text-xs uppercase tracking-widest">
               <Calendar className="w-4 h-4" /> 
               Session Performance Analytics
             </p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
             <button 
              onClick={() => setViewMode("matrix")}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <Users className="w-5 h-5" /> All Users
             </button>
             <button 
              onClick={() => setViewMode("history")}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                <UserCheck className="w-5 h-5" /> User History
             </button>
             {isAdmin && (
               <button 
                onClick={() => setViewMode("config")}
                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${viewMode === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                   <Settings className="w-5 h-5" /> Configure
               </button>
             )}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
             <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-slate-600 px-3 py-2 cursor-pointer text-xs uppercase tracking-widest"
             />
             <div className="h-6 w-px bg-slate-200"></div>
             <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-slate-600 px-3 py-2 cursor-pointer text-xs uppercase tracking-widest"
             />
          </div>
        </div>
      </div>

      {/* Session Slider */}
      {machines.length > 0 ? (
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
           {machines.map(m => {
             const config = sessionIcons[m.description] || sessionIcons.default;
             const Icon = config.icon;
             const isSelected = selectedMachineId === m.id;
             return (
               <button 
                 key={m.id}
                 onClick={() => setSelectedMachineId(m.id)}
                 className={`flex-shrink-0 w-64 p-6 rounded-[2rem] border-2 transition-all duration-300 text-left relative overflow-hidden group ${
                   isSelected 
                   ? `bg-white shadow-2xl ${config.border} border-indigo-600` 
                   : 'bg-white/50 border-transparent hover:border-slate-200 shadow-sm'
                 }`}
               >
                 {isSelected && <div className={`absolute top-0 right-0 w-24 h-24 ${config.bg} rounded-full -mr-12 -mt-12 opacity-50`} />}
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:-rotate-6 ${isSelected ? config.bg : 'bg-slate-100'}`}>
                   <Icon className={`w-6 h-6 ${isSelected ? config.color : 'text-slate-400'}`} />
                 </div>
                 <h3 className={`font-black text-lg tracking-tight ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>{m.description}</h3>
                 <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                   {m.p_start.slice(0, 5)} - {m.l_end.slice(0, 5)}
                 </p>
                 {isSelected && <div className="absolute bottom-4 right-4 w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />}
               </button>
             );
           })}
        </div>
      ) : (
        <div className="p-12 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center space-y-4">
           <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
           <div>
             <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest leading-none">No Sessions Found</h3>
             <p className="text-slate-400 font-bold text-sm mt-2">Please ensure the attendance machines are seeded in the database.</p>
           </div>
        </div>
      )}

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 bg-white/50 rounded-[3rem] border-2 border-dashed border-slate-200">
           <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
           <p className="font-black text-indigo-900/50 uppercase tracking-widest text-xs">Syncing Biometric Logs...</p>
        </div>
      ) : (
        <div className="grid gap-8">
           {viewMode === "matrix" ? (
             /* Matrix Table View */
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                   <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search active session..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-bold"
                      />
                   </div>
                   {activeMachine && (
                     <div className="flex items-center gap-3 bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                        <Monitor className="w-5 h-5 text-indigo-600" />
                        <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Active: {activeMachine.description}</span>
                     </div>
                   )}
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/50">
                         <tr>
                            <th className="px-8 py-6 text-left text-xs font-black text-slate-400 uppercase tracking-widest">User Details</th>
                            {activeMachine && (
                               <th className="px-8 py-6 text-center text-xs font-black text-slate-400 uppercase tracking-widest">
                                  {activeMachine.description} Window
                                  <div className="text-[10px] text-indigo-400 font-bold mt-1 tracking-widest uppercase">{activeMachine.p_start.slice(0,5)} - {activeMachine.l_end.slice(0,5)}</div>
                               </th>
                            )}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {filteredUsers.length > 0 ? filteredUsers.map(user => (
                            <tr key={user.email} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => {
                               setSelectedUserEmail(user.email);
                                setViewMode("history");
                            }}>
                               <td className="px-8 py-8">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-14 h-14 bg-gradient-to-br ${sessionIcons[activeMachine?.description]?.gradient || 'from-slate-100 to-slate-200'} rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md`}>
                                        {user.full_name?.[0]?.toUpperCase() || "?"}
                                     </div>
                                     <div>
                                        <h4 className="font-black text-slate-800 text-lg leading-tight">{user.full_name}</h4>
                                        <p className="text-slate-400 font-bold text-sm tracking-tight">{user.email}</p>
                                     </div>
                                  </div>
                               </td>
                               {activeMachine && (() => {
                                  const logs = user.dates[startDate]?.[activeMachine.description] || [];
                                  const status = getStatus(logs, activeMachine);
                                  return (
                                     <td className="px-8 py-8">
                                        <div className="flex flex-col items-center gap-3">
                                           {status === 'present' ? (
                                              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center border-2 border-emerald-100 shadow-xl shadow-emerald-50 scale-100 group-hover:scale-110 transition-transform">
                                                 <CheckCircle2 className="w-8 h-8" />
                                              </div>
                                           ) : status === 'late' ? (
                                              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-[2rem] flex items-center justify-center border-2 border-amber-100 shadow-xl shadow-amber-50 scale-100 group-hover:scale-110 transition-transform">
                                                 <Clock className="w-8 h-8" />
                                              </div>
                                           ) : (
                                              <div className="w-16 h-16 bg-rose-50 text-rose-400 rounded-[2rem] flex items-center justify-center border-2 border-rose-100 shadow-xl shadow-rose-50 scale-100 group-hover:scale-110 transition-transform">
                                                 <XCircle className="w-8 h-8 opacity-40" />
                                              </div>
                                           )}
                                           {logs.length > 0 && (
                                              <span className="text-[11px] font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 uppercase tracking-widest">
                                                  {new Date(logs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                              </span>
                                           )}
                                        </div>
                                     </td>
                                  );
                               })()}
                            </tr>
                         )) : (
                            <tr>
                               <td colSpan={2} className="px-8 py-20 text-center">
                                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                  <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No user logs found for this date</p>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
           ) : viewMode === "config" ? (
             /* Admin Configuration Hub */
             <div className="space-y-8 animate-in zoom-in-95 duration-300">
                <div className="p-10 bg-indigo-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative z-10">
                      <h3 className="text-4xl font-black tracking-tight font-outfit">Session Configuration Hub</h3>
                      <p className="text-indigo-200 font-bold mt-2 text-lg">Define session names, machine IDs, and status timing rules.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                   {/* Add New Session Card */}
                   {!isAdding ? (
                     <button 
                       onClick={() => setIsAdding(true)}
                       className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-10 flex flex-col items-center justify-center gap-6 hover:border-indigo-300 hover:bg-indigo-50/10 transition-all group min-h-[500px]"
                     >
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                           <Plus className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div className="text-center">
                           <h4 className="font-black text-slate-800 text-2xl tracking-tight">Add New Session</h4>
                           <p className="text-sm font-bold text-slate-400 mt-2">Connect a new machine or create a new session entry.</p>
                        </div>
                     </button>
                   ) : (
                     <div className="bg-white rounded-[3rem] border-4 border-indigo-100 shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                           <h4 className="font-black text-indigo-900 text-2xl tracking-tight">New Configuration</h4>
                           <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-rose-500 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Attendance Type (e.g. Nagar Sankirtan)</label>
                              <input 
                                type="text" 
                                value={newMachine.description}
                                onChange={(e) => setNewMachine({...newMachine, description: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-transparent px-6 py-4 rounded-2xl focus:bg-white focus:border-indigo-100 outline-none font-bold text-slate-800"
                                placeholder="Enter session name..."
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Authorized Machine (SN)</label>
                              <select 
                                value={newMachine.serial_number}
                                onChange={(e) => setNewMachine({...newMachine, serial_number: e.target.value})}
                                className="w-full bg-slate-50 border-2 border-transparent px-6 py-4 rounded-2xl focus:bg-white focus:border-indigo-100 outline-none font-bold text-slate-800 appearance-none transition-all"
                              >
                                <option value="" className="text-slate-400">Select Machine...</option>
                                {machines.length > 0 ? Array.from(new Set(machines.map(m => m.serial_number))).map(sn => (
                                  <option key={sn} value={sn}>{sn}</option>
                                )) : (
                                  <option value="" disabled>No machines registered in hub</option>
                                )}
                              </select>
                           </div>

                           <div className="space-y-4 pt-4 border-t border-slate-50">
                              <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Attendance Status Timing Rules
                              </h5>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                 <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Present Start (P)</label>
                                   <input type="time" value={newMachine.p_start} onChange={(e) => setNewMachine({...newMachine, p_start: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent px-4 py-3 rounded-xl font-bold" />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Present End (P)</label>
                                   <input type="time" value={newMachine.p_end} onChange={(e) => setNewMachine({...newMachine, p_end: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent px-4 py-3 rounded-xl font-bold" />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Late Start (L)</label>
                                   <input type="time" value={newMachine.l_start} onChange={(e) => setNewMachine({...newMachine, l_start: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent px-4 py-3 rounded-xl font-bold" />
                                 </div>
                                 <div className="space-y-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Late End (L)</label>
                                   <input type="time" value={newMachine.l_end} onChange={(e) => setNewMachine({...newMachine, l_end: e.target.value})} className="w-full bg-slate-50 border-2 border-transparent px-4 py-3 rounded-xl font-bold" />
                                 </div>
                              </div>
                           </div>
                           <button 
                             onClick={handleAddMachine}
                             className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest text-xs mt-4"
                           >
                             Save Configuration
                           </button>
                        </div>
                     </div>
                   )}

                   {machines.map((m, idx) => (
                      <div key={m.id} className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl p-10 space-y-8 group hover:border-indigo-200 transition-all">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                               <div className={`w-14 h-14 ${sessionIcons[m.description]?.bg || 'bg-slate-50'} rounded-2xl flex items-center justify-center`}>
                                  <Monitor className={`w-7 h-7 ${sessionIcons[m.description]?.color || 'text-slate-400'}`} />
                               </div>
                               <div>
                                  <h4 className="font-black text-slate-800 text-2xl tracking-tight">Session #{idx + 1}</h4>
                                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Instance Configuration</p>
                               </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteMachine(m.id)}
                              className="w-12 h-12 bg-rose-50 text-rose-400 rounded-2xl flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
                              title="Delete Machine"
                            >
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>

                         <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Attendance Session Name</label>
                                  <input 
                                    type="text" 
                                    defaultValue={m.description}
                                    onBlur={(e) => handleUpdateMachine(m.id, { description: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-transparent px-6 py-4 rounded-2xl focus:bg-white focus:border-indigo-100 outline-none font-bold text-slate-800 transition-all"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mapping Machine ID</label>
                                  <input 
                                    type="text" 
                                    disabled
                                    defaultValue={m.serial_number}
                                    className="w-full bg-slate-50/50 border-2 border-transparent px-6 py-4 rounded-2xl font-bold text-slate-400 uppercase opacity-60"
                                  />
                               </div>
                            </div>

                            <div className="space-y-4">
                               <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                  <Clock className="w-3 h-3" /> Attendance Status Windows
                               </h5>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl">
                                  <div className="space-y-1 text-center">
                                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start P</label>
                                     <input 
                                       type="time" 
                                       defaultValue={m.p_start}
                                       onBlur={(e) => handleUpdateMachine(m.id, { p_start: e.target.value })}
                                       className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-emerald-600"
                                     />
                                  </div>
                                  <div className="space-y-1 text-center">
                                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End P</label>
                                     <input 
                                       type="time" 
                                       defaultValue={m.p_end}
                                       onBlur={(e) => handleUpdateMachine(m.id, { p_end: e.target.value })}
                                       className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-emerald-600"
                                     />
                                  </div>
                                  <div className="space-y-1 text-center">
                                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start L</label>
                                     <input 
                                       type="time" 
                                       defaultValue={m.l_start}
                                       onBlur={(e) => handleUpdateMachine(m.id, { l_start: e.target.value })}
                                       className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-amber-600"
                                     />
                                  </div>
                                  <div className="space-y-1 text-center">
                                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End L</label>
                                     <input 
                                       type="time" 
                                       defaultValue={m.l_end}
                                       onBlur={(e) => handleUpdateMachine(m.id, { l_end: e.target.value })}
                                       className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-amber-600"
                                     />
                                  </div>
                               </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Status Rules</span>
                                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">Auto-Applied</span>
                               </div>
                               <div className="h-4 w-full bg-slate-200 rounded-full flex overflow-hidden shadow-inner">
                                  <div className="h-full bg-emerald-500 w-[30%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest border-r border-white/20">Present</div>
                                  <div className="h-full bg-amber-500 w-[40%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest border-r border-white/20">Late</div>
                                  <div className="h-full bg-rose-400 w-[30%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest">Absent</div>
                               </div>
                               <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase font-mono">
                                  <span>{m.p_start.slice(0,5)}</span>
                                  <span>{m.p_end.slice(0,5)}</span>
                                  <span>{m.l_end.slice(0,5)}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           ) : (
             /* History View */
             <div className="space-y-8">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between overflow-hidden relative border-4 border-white/5">
                   <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                   <div className="relative z-10 space-y-4">
                      <button onClick={() => setViewMode("matrix")} className="flex items-center gap-2 text-indigo-300 font-black uppercase tracking-[0.2em] text-[10px] bg-white/5 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                         <ChevronLeft className="w-4 h-4" /> Back to Matrix
                      </button>
                      <div>
                        <h3 className="text-4xl sm:text-5xl font-black tracking-tight font-outfit truncate max-w-lg">{displayUser?.full_name}</h3>
                        <p className="text-indigo-300 font-bold text-lg mt-1 tracking-tight">{displayUser?.email}</p>
                      </div>
                   </div>
                   <div className="relative z-10 flex gap-8 sm:gap-12 mt-8 md:mt-0">
                      <div className="text-center">
                         <div className="text-4xl sm:text-5xl font-black mb-1 font-outfit">94%</div>
                         <div className="text-[9px] uppercase font-black text-indigo-300 tracking-[0.2em]">Overall Present</div>
                      </div>
                      <div className="text-center border-l border-white/10 pl-8 sm:pl-12">
                         <div className="text-4xl sm:text-5xl font-black mb-1 font-outfit">
                           {Object.keys(displayUser?.dates || {}).length}
                         </div>
                         <div className="text-[9px] uppercase font-black text-indigo-300 tracking-[0.2em]">Days Filtered</div>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                   {machines.filter(m => !selectedMachineId || m.id === selectedMachineId).map(m => (
                      <div key={m.id} className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl p-10 space-y-8">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-100 pb-8">
                            <div className="flex items-center gap-5">
                               <div className={`w-14 h-14 ${sessionIcons[m.description]?.bg || 'bg-slate-50'} rounded-2xl flex items-center justify-center`}>
                                  <Monitor className={`w-7 h-7 ${sessionIcons[m.description]?.color || 'text-slate-400'}`} />
                                </div>
                               <div>
                                  <h4 className="font-black text-slate-800 text-2xl tracking-tight">{m.description} Trace</h4>
                                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-0.5">Present: {m.p_start.slice(0,5)} — {m.p_end.slice(0,5)} | Late: {m.l_start.slice(0,5)} — {m.l_end.slice(0,5)}</p>
                               </div>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Object.entries(displayUser?.dates || {}).sort().reverse().map(([date, sessions]: any) => {
                               const logs = sessions[m.description] || [];
                               const status = getStatus(logs, m);
                               return (
                                  <div key={date} className="group p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                                     <div className={`absolute top-0 left-0 w-1.5 h-full ${status === 'present' ? 'bg-emerald-500' : status === 'late' ? 'bg-amber-500' : 'bg-rose-400 opacity-20'}`}></div>
                                     <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                           <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })}
                                           </div>
                                           <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                              status === 'present' ? 'bg-emerald-50 text-emerald-600' :
                                              status === 'late' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-400'
                                           }`}>
                                              {status}
                                           </div>
                                        </div>
                                        <div className="font-black text-2xl text-slate-800 font-outfit">
                                           {logs.length > 0 ? (
                                             new Date(logs[0].check_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                           ) : (
                                             <span className="text-slate-300">--:--</span>
                                           )}
                                        </div>
                                     </div>
                                  </div>
                               );
                            })}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
