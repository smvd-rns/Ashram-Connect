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

  // Custom Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    fetchMachines();
  }, [startDate, endDate, session]);

  const fetchMachines = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/admin/attendance-config", {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.machines) setMachines(data.machines);
    } catch (err) {
      console.error("Machine list fetch failed:", err);
    }
  };

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
        // Default selected machine for matrix view
        if (!selectedMachineId && data.machines.length > 0) {
          const firstMachine = data.machines.find((m: any) => m.description) || data.machines[0];
          setSelectedMachineId(firstMachine.id);
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
    
    // Find the EARLIEST punch of the day — subsequent punches (check-outs, re-entries)
    // should NOT affect the status. Only the first check-in determines P or L.
    const earliestLog = logs.reduce((earliest, log) => {
      return new Date(log.check_time) < new Date(earliest.check_time) ? log : earliest;
    }, logs[0]);

    // Extract UTC time string "HH:mm:ss" — machine p/l windows are stored as UTC-based times
    // IMPORTANT: Do NOT use toLocaleTimeString() — it converts to browser local time (IST)
    // which breaks the comparison against machine window settings.
    const checkTime = new Date(earliestLog.check_time).toISOString().slice(11, 19);
    
    // P (Present): first punch is between p_start and p_end
    if (machine.p_start && machine.p_end && checkTime >= machine.p_start && checkTime <= machine.p_end) {
      return "present";
    }
    
    // L (Late): first punch is between l_start and l_end
    if (machine.l_start && machine.l_end && checkTime >= machine.l_start && checkTime <= machine.l_end) {
      return "late";
    }
    
    // Punched outside both windows (too early or too late)
    return "absent";
  };

  // Helper: Get raw HH:mm from "HH:mm:ss" or full timestamp without timezone shift
  const formatRawTime = (timeInput: string | Date | null) => {
    if (!timeInput) return "--:--";
    try {
      // If it's a full timestamp (e.g. 2026-04-01...), parse and extract UTC time part
      if (typeof timeInput === "string" && timeInput.includes("-")) {
        return new Date(timeInput).toISOString().slice(11, 16);
      }
      // If it's already a time string (e.g. 04:00:00), just slice first 5 chars
      if (typeof timeInput === "string") return timeInput.slice(0, 5);
      
      return new Date(timeInput).toISOString().slice(11, 16);
    } catch (e) {
      return "--:--";
    }
  };

  // Filtered Data Logic
  const filteredUsers = report.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If a machine is selected in matrix mode, only show users assigned to that machine
    if (isAdmin && viewMode === "matrix" && selectedMachineId) {
      return matchesSearch && u.assigned_machines?.includes(selectedMachineId);
    }
    
    return matchesSearch;
  });

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
      // Check if machine already exists (it usually does if added via Device Hub)
      const existingMachine = machines.find(m => m.serial_number === newMachine.serial_number);
      
      const payload = existingMachine 
        ? { action: 'update_machine', data: { id: existingMachine.id, ...newMachine } }
        : { action: 'add_machine', data: newMachine };

      await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
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
      fetchMachines(); // Sync the session names
    } catch (err) {
      console.error("Add failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMachine = async (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    try {
      await fetch('/api/admin/attendance-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          action: 'update_machine', 
          data: { 
            id: deletingId, 
            p_start: null, 
            p_end: null, 
            l_start: null, 
            l_end: null 
          } 
        })
      });
      fetchReport();
      fetchMachines();
      setShowDeleteConfirm(false);
      setDeletingId(null);
    } catch (err) {
      console.error("Remove failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 max-w-lg w-full p-12 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-10 h-10 text-rose-500" />
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Remove Session?</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                Are you sure you want to remove this session? This will clear the timing rules (P/L windows) but will <span className="text-indigo-600">keep the hardware registered</span> in the Device Hub.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-200 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove Session"}
              </button>
            </div>
          </div>
        </div>
      )}

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
             <Calendar className="w-4 h-4 text-slate-400 ml-3" />
             <input 
              type="date" 
              value={startDate} 
              onChange={(e) => {
                 setStartDate(e.target.value);
                 setEndDate(e.target.value);
              }}
              className="bg-transparent border-none focus:ring-0 font-bold text-slate-600 pr-3 py-2 cursor-pointer text-xs uppercase tracking-widest"
             />
          </div>
        </div>
      </div>

      {/* Session Slider */}
      {machines.length > 0 ? (
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
           {machines.filter(m => m.p_start && m.p_end).map(m => {
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
                    {formatRawTime(m.p_start)} - {formatRawTime(m.p_end)}
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
                   <table className="w-full text-left table-auto border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                         <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">User Details</th>
                             <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Check-in Date</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Time</th>
                            <th className="px-6 py-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {(() => {
                            const rows: any[] = [];
                            if (!activeMachine) return null;

                            filteredUsers.forEach(user => {
                               Object.entries(user.dates).forEach(([date, sessions]: [string, any]) => {
                                  // CRITICAL: Sort logs by check_time to ensure [0] is ALWAYS the earliest punch
                                  const logs = (sessions[activeMachine.description] || []).sort((a: any, b: any) => 
                                     new Date(a.check_time).getTime() - new Date(b.check_time).getTime()
                                  );

                                  const status = getStatus(logs, activeMachine);
                                  rows.push({ user, date, logs, status });
                               });
                            });

                            const sortedRows = rows.sort((a, b) => b.date.localeCompare(a.date) || a.user.full_name.localeCompare(b.user.full_name));

                            if (sortedRows.length === 0) {
                               return (
                                  <tr>
                                     <td colSpan={4} className="px-8 py-20 text-center">
                                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">No logs found in this period</p>
                                     </td>
                                  </tr>
                               );
                            }

                            return sortedRows.map((row, idx) => (
                               <tr key={`${row.user.email}-${row.date}`} className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => {
                                  setSelectedUserEmail(row.user.email);
                                  setViewMode("history");
                               }}>
                                  <td className="px-6 py-3">
                                     <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-[10px] shadow-sm bg-gradient-to-br ${sessionIcons[activeMachine?.description]?.gradient || 'from-slate-400 to-slate-500'}`}>
                                           {row.user.full_name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                           <div className="font-black text-slate-800 text-sm leading-none">{row.user.full_name}</div>
                                           <div className="text-slate-400 font-bold text-[10px] mt-1">{row.user.email}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-3 text-xs font-black text-slate-400 tabular-nums">
                                      {row.logs[0]?.zk_user_id || "--"}
                                   </td>
                                   <td className="px-6 py-3 text-sm font-bold text-slate-600 tabular-nums">
                                     {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="px-6 py-3 text-sm font-black text-indigo-600 tabular-nums">
                                     {row.logs.length > 0 ? formatRawTime(row.logs[0].check_time) : "--:--"}
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                     <div className="flex justify-center">
                                        {row.status === 'present' ? (
                                           <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-emerald-100">P</span>
                                        ) : row.status === 'late' ? (
                                           <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-amber-100">L</span>
                                        ) : (
                                           <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs">A</span>
                                        )}
                                     </div>
                                  </td>
                               </tr>
                            ));
                         })()}
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
                                {machines.map(m => (
                                  <option key={m.id} value={m.serial_number}>
                                    {m.serial_number} {m.description ? `(${m.description})` : ""}
                                  </option>
                                ))}
                                {machines.length === 0 && (
                                  <option value="" disabled>No devices authorized in Hub yet</option>
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

                    {machines.filter(m => m.p_start && m.p_end).map((m, idx) => (
                       <SessionCard 
                        key={m.id} 
                        m={m} 
                        idx={idx} 
                        sessionIcons={sessionIcons} 
                        handleDeleteMachine={handleDeleteMachine} 
                        handleUpdateMachine={handleUpdateMachine} 
                       />
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
                                  <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mt-0.5">Present: {formatRawTime(m.p_start)} — {formatRawTime(m.p_end)} | Late: {formatRawTime(m.l_start)} — {formatRawTime(m.l_end)}</p>
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
                                             formatRawTime(logs[0].check_time)
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

function SessionCard({ m, idx, sessionIcons, handleDeleteMachine, handleUpdateMachine }: any) {
  const [localData, setLocalData] = React.useState(m);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    setLocalData(m);
    setHasChanges(false);
  }, [m]);

  const handleChange = (updates: any) => {
    setLocalData({ ...localData, ...updates });
    setHasChanges(true);
  };

  const handleSave = () => {
    handleUpdateMachine(m.id, localData);
    setHasChanges(false);
  };

  return (
    <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-xl p-10 space-y-8 group hover:border-indigo-200 transition-all">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
             <div className={`w-14 h-14 ${sessionIcons[localData.description]?.bg || 'bg-slate-50'} rounded-2xl flex items-center justify-center`}>
                <Monitor className={`w-7 h-7 ${sessionIcons[localData.description]?.color || 'text-slate-400'}`} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 text-2xl tracking-tight">Session #{idx + 1}</h4>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Instance Configuration</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             {hasChanges && (
               <button 
                 onClick={handleSave}
                 className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
               >
                 <CheckCircle2 className="w-4 h-4" /> Save Changes
               </button>
             )}
             <button 
               onClick={() => handleDeleteMachine(m.id)}
               className="w-12 h-12 bg-rose-50 text-rose-400 rounded-2xl flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors"
               title="Remove Session"
             >
                <Trash2 className="w-5 h-5" />
             </button>
          </div>
       </div>

       <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Attendance Session Name</label>
                <input 
                  type="text" 
                  value={localData.description}
                  onChange={(e) => handleChange({ description: e.target.value })}
                  className="w-full bg-slate-50 border-2 border-transparent px-6 py-4 rounded-2xl focus:bg-white focus:border-indigo-100 outline-none font-bold text-slate-800 transition-all"
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Mapping Machine ID</label>
                <input 
                  type="text" 
                  disabled
                  value={localData.serial_number}
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
                     value={localData.p_start || ""}
                     onChange={(e) => handleChange({ p_start: e.target.value })}
                     className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-emerald-600"
                   />
                </div>
                <div className="space-y-1 text-center">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End P</label>
                   <input 
                     type="time" 
                     value={localData.p_end || ""}
                     onChange={(e) => handleChange({ p_end: e.target.value })}
                     className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-emerald-600"
                   />
                </div>
                <div className="space-y-1 text-center">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start L</label>
                   <input 
                     type="time" 
                     value={localData.l_start || ""}
                     onChange={(e) => handleChange({ l_start: e.target.value })}
                     className="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-xs font-black text-amber-600"
                   />
                </div>
                <div className="space-y-1 text-center">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End L</label>
                   <input 
                     type="time" 
                     value={localData.l_end || ""}
                     onChange={(e) => handleChange({ l_end: e.target.value })}
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
                <span>{localData.p_start?.slice(0,5) || "--:--"}</span>
                <span>{localData.p_end?.slice(0,5) || "--:--"}</span>
                <span>{localData.l_end?.slice(0,5) || "--:--"}</span>
             </div>
          </div>
       </div>
    </div>
  );
}
