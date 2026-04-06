"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2, Filter, Calendar, Users, HardDrive,
  ChevronLeft, ChevronRight, Download, CheckCircle2, XCircle,
  Clock, AlertCircle, Search, Monitor, Settings, ArrowRightLeft,
  UserCheck, Plus, Trash2, Activity, Star
} from "lucide-react";

interface AttendanceTracingProps {
  isAdmin?: boolean;
  forceUserView?: boolean;
  session: any;
  profile: any;
}

export default function AttendanceTracing({ isAdmin = false, forceUserView = false, session, profile }: AttendanceTracingProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);

  // Filtering State
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "custom">("month");
  const [currentPivotDate, setCurrentPivotDate] = useState(new Date().toISOString().split('T')[0]);
  const [customRangeStart, setCustomRangeStart] = useState("");
  const [customRangeEnd, setCustomRangeEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Session Slider State
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // View Modes: "matrix" (Users x Machines for 1 Day), "history" (Dates x sessions for 1 User), or "config" (Admin session setup)
  const [viewMode, setViewMode] = useState<"matrix" | "history" | "config">((isAdmin && !forceUserView) ? "matrix" : "history");
  const [selectedUserEmail, setSelectedUserEmail] = useState((isAdmin && !forceUserView) ? "" : profile?.email);

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

  // User History Admin Search
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [historyPivot, setHistoryPivot] = useState(new Date().toISOString().split('T')[0]);
  const [historyRange, setHistoryRange] = useState<"week" | "month">("month");

  // Sync profile data when forceUserView is active
  useEffect(() => {
    if (forceUserView && profile?.email) {
      setSelectedUserEmail(profile.email);
      setViewMode("history");
    }
  }, [forceUserView, profile?.email]);

  // Harinam dropdown open state: tracks email-date key
  const [openHarinamKey, setOpenHarinamKey] = useState<string | null>(null);

  const sessionIcons: Record<string, any> = {
    "Mangal Aarti": { icon: Clock, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100", gradient: "from-orange-500 to-amber-600", shadow: "shadow-orange-200/50", accent: "bg-orange-500" },
    "SB Class": { icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", gradient: "from-indigo-500 to-purple-600", shadow: "shadow-indigo-200/50", accent: "bg-indigo-500" },
    "BC Class": { icon: Monitor, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", gradient: "from-purple-500 to-indigo-600", shadow: "shadow-purple-200/50", accent: "bg-purple-500" },
    "Harinam": { icon: Users, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", gradient: "from-rose-500 to-pink-600", shadow: "shadow-rose-200/50", accent: "bg-rose-500" },
    "Afternoon Session": { icon: Settings, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-200/50", accent: "bg-amber-500" },
    "default": { icon: HardDrive, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", gradient: "from-slate-500 to-slate-700", shadow: "shadow-slate-200/50", accent: "bg-slate-500" }
  };

  // Parse a YYYY-MM-DD string as LOCAL date (not UTC)
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Format a Date object to YYYY-MM-DD using local time
  const toLocalDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Maps short session names to more descriptive labels as requested
  const getSessionLabel = (name: string) => {
    if (!name) return "";
    const mapping: Record<string, string> = {
      "BC": "BC Class",
      "SB": "SB Class",
      "Mangal": "Mangal Aarti",
      "Hari": "Harinam",
      "Harinam": "Harinam",
      "Hari Nam": "Harinam"
    };
    // Check for exact matches first, then case-insensitive
    if (mapping[name]) return mapping[name];
    const upper = name.toUpperCase();
    if (mapping[upper]) return mapping[upper];
    // Return original if no mapping found
    return name;
  };

  // Helper to get range based on pivot and type
  const getRange = (pivot: string, type: "day" | "week" | "month" | "custom") => {
    if (type === "custom") {
      return {
        start: customRangeStart || pivot,
        end: customRangeEnd || pivot
      };
    }
    // Use local date parsing to avoid UTC timezone offset issues
    const date = parseLocalDate(pivot);
    if (type === "day") {
      return { start: pivot, end: pivot };
    }
    if (type === "week") {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(date.getFullYear(), date.getMonth(), diff);
      const end = new Date(date.getFullYear(), date.getMonth(), diff + 6);
      return {
        start: toLocalDateStr(start),
        end: toLocalDateStr(end)
      };
    }
    if (type === "month") {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return {
        start: toLocalDateStr(start),
        end: toLocalDateStr(end)
      };
    }
    return { start: pivot, end: pivot };
  };

  useEffect(() => {
    fetchReport();
    fetchMachines();
  }, [viewMode, currentPivotDate, timeRange, customRangeStart, customRangeEnd, historyRange, historyPivot, session]);

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
      let startStr: string, endStr: string;
      if (viewMode === 'history') {
        const pivot = parseLocalDate(historyPivot);
        if (historyRange === 'week') {
          const day = pivot.getDay();
          const diff = pivot.getDate() - day + (day === 0 ? -6 : 1);
          startStr = toLocalDateStr(new Date(pivot.getFullYear(), pivot.getMonth(), diff));
          endStr = toLocalDateStr(new Date(pivot.getFullYear(), pivot.getMonth(), diff + 6));
        } else {
          startStr = toLocalDateStr(new Date(pivot.getFullYear(), pivot.getMonth(), 1));
          endStr = toLocalDateStr(new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0));
        }
      } else {
        const { start, end } = getRange(currentPivotDate, timeRange);
        startStr = start;
        endStr = end;
      }
      const res = await fetch(`/api/attendance/report?startDate=${startStr}&endDate=${endStr}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
      if (data.machines) {
        setMachines(data.machines);
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

  const handleMarkHarinam = async (email: string, date: string, field: string, value: number) => {
    // Optimistically update local state immediately (no flicker/refresh)
    setReport(prev => prev.map(user => {
      if (user.email !== email) return user;
      const updatedDates = { ...user.dates };
      if (!updatedDates[date]) updatedDates[date] = {};
      // Find the harinam_virtual session key
      const harinamKey = Object.keys(updatedDates[date]).find(k => k.toLowerCase().includes('hari')) || 'Hari Nam';
      const existingLogs = updatedDates[date][harinamKey] || [{}];
      updatedDates[date] = {
        ...updatedDates[date],
        [harinamKey]: [{ ...existingLogs[0], [field]: value }]
      };
      return { ...user, dates: updatedDates };
    }));
    // Save to server in background
    try {
      await fetch('/api/admin/harinam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "update_harinam", data: { user_email: email, date, [field]: value } })
      });
    } catch (e) { console.error(e); }
  };

  const handleBulkHarinam = async (field: string, date: string, value: number) => {
    const emails = filteredUsers.map(u => u.email);
    if (emails.length === 0) return;
    // Optimistic update for all affected users
    setReport(prev => prev.map(user => {
      if (!emails.includes(user.email)) return user;
      const updatedDates = { ...user.dates };
      if (!updatedDates[date]) updatedDates[date] = {};
      const harinamKey = Object.keys(updatedDates[date]).find(k => k.toLowerCase().includes('hari')) || 'Hari Nam';
      const existingLogs = updatedDates[date][harinamKey] || [{}];
      updatedDates[date] = {
        ...updatedDates[date],
        [harinamKey]: [{ ...existingLogs[0], [field]: value }]
      };
      return { ...user, dates: updatedDates };
    }));
    // Save to server in background
    try {
      await fetch('/api/admin/harinam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action: "bulk_update_harinam", data: { emails, date, update: { [field]: value } } })
      });
    } catch (e) { console.error(e); }
  };

  const getStatus = (logs: any[], machine: any) => {
    if (!logs || logs.length === 0) return "absent";
    const earliestLog = logs.reduce((earliest, log) => {
      if (!log.check_time) return earliest; // Ignore logs without check_time when finding earliest
      if (!earliest.check_time) return log;
      return new Date(log.check_time) < new Date(earliest.check_time) ? log : earliest;
    }, logs[0]);

    if (!earliestLog || !earliestLog.check_time) {
      // Manual entries or duration-based features
      if (logs.some(l => l.is_manual || l.h7am !== undefined || l.h740am !== undefined || l.hpdc !== undefined || l.hcustom_mins > 0)) {
        return "present";
      }
      return "absent";
    }

    try {
      const checkTime = new Date(earliestLog.check_time).toISOString().slice(11, 19);
      if (machine.p_start && machine.p_end && checkTime >= machine.p_start && checkTime <= machine.p_end) {
        return "present";
      }
      if (machine.l_start && machine.l_end && checkTime >= machine.l_start && checkTime <= machine.l_end) {
        return "late";
      }
    } catch (e) {
      return "absent";
    }
    return "absent";
  };

  const formatRawTime = (timeInput: string | Date | null) => {
    if (!timeInput) return "--:--";
    try {
      if (typeof timeInput === "string" && timeInput.includes("-")) {
        return new Date(timeInput).toISOString().slice(11, 16);
      }
      if (typeof timeInput === "string") return timeInput.slice(0, 5);
      return new Date(timeInput).toISOString().slice(11, 16);
    } catch (e) {
      return "--:--";
    }
  };

  const getPeriodLabel = () => {
    const { start, end } = getRange(currentPivotDate, timeRange);
    // Parse as local time (not UTC) by using T00:00:00
    if (timeRange === "day") {
      return new Date(start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const startStr = new Date(start + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const endStr = new Date(end + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const handleNavigate = (direction: number) => {
    const date = new Date(currentPivotDate);
    if (timeRange === "day") {
      date.setDate(date.getDate() + direction);
    } else if (timeRange === "week") {
      date.setDate(date.getDate() + direction * 7);
    } else if (timeRange === "month") {
      date.setMonth(date.getMonth() + direction);
    }
    setCurrentPivotDate(date.toISOString().split('T')[0]);
  };

  const filteredUsers = report.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
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
      fetchReport();
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
        serial_number: "", description: "", ingestion_start: "02:00", ingestion_end: "11:00",
        p_start: "04:00", p_end: "04:15", l_start: "04:15", l_end: "05:30"
      });
      fetchReport();
      fetchMachines();
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

  const handleExportExcel = () => {
    if (!activeMachine || filteredUsers.length === 0) return;

    const isHarinam = activeMachine.id === 'harinam_virtual';
    const dates = getDateColumns();

    // Build HTML table structure for Excel styling support
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${getSessionLabel(activeMachine.description).replace(/\s+/g, '_')}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-transform: uppercase; }
          .present { background-color: #10b981; color: #ffffff; font-weight: bold; text-align: center; }
          .late { background-color: #fbbf24; color: #ffffff; font-weight: bold; text-align: center; }
          .absent { background-color: #f43f5e; color: #ffffff; font-weight: bold; text-align: center; }
          .name-col { text-align: left; font-weight: bold; min-width: 180px; }
          .summary-col { background-color: #f8fafc; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Biometric ID</th>
              ${dates.map(d => `<th>${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</th>`).join('')}
              ${isHarinam ? '<th>Total Hrs</th>' : '<th>P</th><th>L</th><th>A</th><th>%</th>'}
            </tr>
          </thead>
          <tbody>
    `;

    filteredUsers.forEach(user => {
      let p = 0, l = 0, a = 0;
      let totalHarinamMins = 0;
      const biometricId = user.dates[Object.keys(user.dates)[0]]?.[activeMachine?.description]?.[0]?.zk_user_id || "--";

      html += `<tr>
        <td class="name-col">${user.full_name}</td>
        <td>${user.email}</td>
        <td>${biometricId}</td>`;

      dates.forEach(date => {
        const logs = (user.dates[date]?.[activeMachine?.description] || []);
        if (isHarinam) {
          let dayMins = 0;
          if (logs.length > 0) {
            dayMins = (logs[0].h7am || 0) + (logs[0].h740am || 0) + (logs[0].hpdc || 0) + (logs[0].hcustom_mins || 0);
            totalHarinamMins += dayMins;
          }
          const hrs = dayMins / 60;
          html += `<td style="text-align: center;">${hrs > 0 ? (hrs % 1 === 0 ? hrs : hrs.toFixed(1)) : 0}</td>`;
        } else {
          const status = getStatus(logs, activeMachine);
          let cellClass = "";
          let displayVal = status.charAt(0).toUpperCase();

          if (status === 'present') { p++; cellClass = "present"; }
          else if (status === 'late') { l++; cellClass = "late"; }
          else { a++; cellClass = "absent"; }

          if (logs.length > 0 && status !== 'absent') {
            const earliest = logs.reduce((min: any, log: any) =>
              (!min.check_time || (log.check_time && new Date(log.check_time) < new Date(min.check_time))) ? log : min
              , logs[0]);
            const time = formatRawTime(earliest.check_time);
            displayVal += ` (${time})`;
          }

          html += `<td class="${cellClass}">${displayVal}</td>`;
        }
      });

      if (isHarinam) {
        const totalHrs = totalHarinamMins / 60;
        html += `<td class="summary-col">${totalHrs % 1 === 0 ? totalHrs : totalHrs.toFixed(1)}</td>`;
      } else {
        html += `
          <td class="summary-col">${p}</td>
          <td class="summary-col">${l}</td>
          <td class="summary-col">${a}</td>
          <td class="summary-col">${Math.round(((p + l) / dates.length) * 100)}%</td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${getSessionLabel(activeMachine.description).replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          data: { id: deletingId, p_start: null, p_end: null, l_start: null, l_end: null }
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

  // Register View Helper
  const getDateColumns = () => {
    const { start, end } = getRange(currentPivotDate, timeRange);
    const dates = [];
    // Parse as local time to avoid timezone shift
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    let curr = new Date(sy, sm - 1, sd);
    const last = new Date(ey, em - 1, ed);
    while (curr <= last) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-x-hidden no-scrollbar">
      {/* Dynamic Background Blobs for Visual Depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[20%] right-[15%] w-[20%] h-[20%] bg-purple-100/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-white/20 max-w-lg w-full p-12 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Trash2 className="w-10 h-10 text-rose-500" />
            </div>
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight font-outfit">Remove Session?</h3>
              <p className="text-slate-500 font-bold leading-relaxed">
                Are you sure you want to remove this session? Hardware remains registered but <span className="text-indigo-600">timing rules will be cleared</span>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-8 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-3xl transition-all uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-8 py-5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-3xl transition-all shadow-xl shadow-rose-200 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Remove Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls - Premium Style */}
      <div className="bg-white/95 backdrop-blur-3xl p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-white flex flex-col items-center justify-center gap-8 px-4 sm:px-8">

        {/* Row 1: Branding */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-100 group transition-transform hover:rotate-6">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter font-outfit uppercase">Attendance Hub</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">Real-time Analytics Engine</p>
            </div>
          </div>
        </div>

        {/* Row 2: Logic Switchers */}
        <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
          {!forceUserView && (
            <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 backdrop-blur-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button onClick={() => setViewMode("matrix")} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${viewMode === 'matrix' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-700'}`}>
                <Users className="w-3.5 h-3.5" /> All Users
              </button>
              <button onClick={() => setViewMode("history")} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${viewMode === 'history' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-700'}`}>
                <UserCheck className="w-3.5 h-3.5" /> User History
              </button>
              {isAdmin && (
                <button onClick={() => setViewMode("config")} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${viewMode === 'config' ? 'bg-white text-indigo-600 shadow-lg scale-105' : 'text-slate-400 hover:text-slate-700'}`}>
                  <Settings className="w-3.5 h-3.5" /> Config
                </button>
              )}
            </div>
          )}


        </div>
      </div>



      {loading ? (
        <div className="h-[500px] flex flex-col items-center justify-center gap-4 bg-white/30 backdrop-blur-sm rounded-[4rem] border-2 border-dashed border-slate-200">
          <div className="relative">
            <Loader2 className="w-20 h-20 text-indigo-600 animate-spin opacity-20" />
            <Activity className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="font-outfit font-black text-indigo-900 uppercase tracking-[0.4em] text-sm animate-pulse">Syncing Biometrics</p>
        </div>
      ) : (
        <div className="grid gap-12 w-full">
          {viewMode === "matrix" ? (
            <div className="bg-white/95 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[4rem] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] overflow-hidden w-full transition-all duration-700">
              <div className="p-3 sm:p-4 flex flex-col bg-slate-50/20">

                {/* Single Row Compact Header */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full pb-2">

                  {/* Filter & Date Controls */}
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Time Range */}
                    <div className="flex items-center p-1 bg-slate-100/50 rounded-xl sm:rounded-2xl border border-slate-200/50 shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
                      {(["day", "week", "month", "custom"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          className={`px-4 py-2 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm uppercase tracking-tight transition-all duration-300 whitespace-nowrap ${timeRange === r ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {/* Navigation Pills */}
                    <div className="flex items-center bg-white p-1 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm gap-1 group/nav w-full sm:w-auto">
                      {timeRange !== 'custom' ? (
                        <>
                          <button onClick={() => handleNavigate(-1)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all active:scale-90 overflow-hidden relative">
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <div className="relative flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-50/30 border border-indigo-100/30 rounded-lg group/date cursor-pointer">
                            <Calendar className="w-4 h-4 text-indigo-400 mr-2" />
                            <span className="text-sm font-black text-slate-700 tracking-tight tabular-nums group-hover/date:text-indigo-600 transition-colors whitespace-nowrap">
                              {getPeriodLabel()}
                            </span>
                            <input type="date" value={currentPivotDate} onChange={(e) => setCurrentPivotDate(e.target.value)} className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                          </div>

                          <button onClick={() => handleNavigate(1)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all active:scale-90 overflow-hidden relative">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 w-full sm:w-auto">
                          <div className="flex-1 sm:flex-none flex flex-col items-center px-4 py-1 bg-slate-50/50 border border-slate-100 rounded-lg hover:border-indigo-400 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-sm relative">
                            <input type="date" value={customRangeStart || currentPivotDate} onChange={(e) => setCustomRangeStart(e.target.value)} className="bg-transparent border-none p-0 text-xs sm:text-sm font-black text-slate-700 outline-none w-full sm:w-24 text-center" />
                          </div>
                          <ArrowRightLeft className="hidden sm:block w-3.5 h-3.5 text-indigo-400" />
                          <div className="flex-1 sm:flex-none flex flex-col items-center px-4 py-1 bg-slate-50/50 border border-slate-100 rounded-lg hover:border-indigo-400 focus-within:border-indigo-500 focus-within:bg-white transition-all shadow-sm relative">
                            <input type="date" value={customRangeEnd || currentPivotDate} onChange={(e) => setCustomRangeEnd(e.target.value)} className="bg-transparent border-none p-0 text-xs sm:text-sm font-black text-slate-700 outline-none w-full sm:w-24 text-center" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Session & Export Actions (14px) */}
                  {activeMachine && (
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0 xl:ml-auto pr-1">
                      <div className="relative flex flex-1 sm:flex-none items-center justify-center sm:justify-start gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 shadow-sm transition-all hover:bg-white hover:shadow-md group/session">
                        <Monitor className="w-4 h-4 text-indigo-600 group-hover/session:rotate-6 transition-transform flex-shrink-0" />
                        <div className="leading-tight text-center sm:text-left flex-1 sm:flex-none">
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Session</p>
                          <select
                            value={selectedMachineId || ''}
                            onChange={(e) => setSelectedMachineId(e.target.value)}
                            className="appearance-none bg-transparent border-none outline-none text-sm font-black text-slate-900 tracking-tight uppercase cursor-pointer w-full sm:w-auto text-center sm:text-left pr-4 max-w-[160px] truncate"
                          >
                            {machines.filter(m => m.p_start && m.p_end).map(m => (
                              <option key={m.id} value={m.id}>{getSessionLabel(m.description)}</option>
                            ))}
                          </select>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400 rotate-90 flex-shrink-0 -ml-1 absolute right-3 top-1/2 -translate-y-1/2 sm:static" />
                      </div>

                      <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex justify-center items-center gap-2.5 bg-slate-900 hover:bg-slate-950 text-white px-5 py-2.5 rounded-xl transition-all active:scale-95 group/export shadow-[0_10px_20px_-5px_rgba(15,23,42,0.15)] overflow-hidden relative">
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Download className="w-4 h-4 text-indigo-400 group-hover/export:animate-bounce" />
                        <span className="text-xs sm:text-sm font-black uppercase tracking-widest whitespace-nowrap">Export</span>
                      </button>

                      <div className="relative flex items-center w-full sm:w-auto group/search">
                        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full sm:w-56 pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-2 sm:p-6">
                {timeRange === 'day' ? (
                  <div className="overflow-x-auto overflow-y-hidden custom-attendance-scrollbar pb-4">
                    <table className="w-full text-left border-separate border-spacing-y-3 sm:border-spacing-y-4 min-w-[800px]">
                      <thead>
                        <tr>
                          <th className="px-4 sm:px-8 py-4 text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Member Portfolio</th>
                          {selectedMachineId === 'harinam_virtual' ? (
                            <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Harinam Activity Selection</th>
                          ) : (
                            <>
                              <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Biometric ID</th>
                              <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Punch Date</th>
                              <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Log Time</th>
                              <th className="px-4 sm:px-8 py-4 text-center text-[9px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Verdict</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows: any[] = [];
                          if (!activeMachine) return null;
                          filteredUsers.forEach(user => {
                            Object.entries(user.dates).forEach(([date, sessions]: [string, any]) => {
                              const logs = (sessions[activeMachine.description] || []).sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime());
                              const status = getStatus(logs, activeMachine);
                              rows.push({ user, date, logs, status });
                            });
                          });
                          const sortedRows = rows.sort((a, b) => b.date.localeCompare(a.date) || a.user.full_name.localeCompare(b.user.full_name));
                          if (sortedRows.length === 0) return <tr><td colSpan={5} className="py-32 text-center text-slate-300 font-outfit font-black uppercase text-sm italic opacity-40">No Log Activity Found</td></tr>;
                          return sortedRows.map((row) => (
                            <tr key={`${row.user.email}-${row.date}`} className="bg-white rounded-2xl shadow-sm transition-all group">
                              <td className="px-6 py-2 first:rounded-l-2xl">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-[10px] shadow-lg bg-gradient-to-br ${sessionIcons[getSessionLabel(activeMachine?.description)]?.gradient || 'from-slate-400 to-slate-500'} group-hover:rotate-6 transition-transform`}>{row.user.full_name?.[0]?.toUpperCase()}</div>
                                  <div>
                                    <div className="font-black text-slate-800 text-[15px] leading-tight tracking-tight">{row.user.full_name}</div>
                                    <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{row.user.email}</div>
                                  </div>
                                </div>
                              </td>
                              {selectedMachineId === 'harinam_virtual' ? (
                                <td className="px-6 py-3 last:rounded-r-2xl" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {[
                                      { id: 'h7am', label: '7:00 AM', val: 30 },
                                      { id: 'h740am', label: '7:40 AM', val: 30 },
                                      { id: 'hpdc', label: 'PDC', val: 90 }
                                    ].map(opt => {
                                      const isActive = (row.logs[0]?.[opt.id] || 0) > 0;
                                      return (
                                        <button
                                          key={opt.id}
                                          onClick={(e) => { e.stopPropagation(); handleMarkHarinam(row.user.email, row.date, opt.id, isActive ? 0 : opt.val); }}
                                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] sm:text-[10px] border transition-all duration-200 select-none tracking-tight ${isActive
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200/50 scale-[1.02]'
                                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 hover:shadow-sm'
                                            }`}
                                        >
                                          {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_4px_white]" />}
                                          {opt.label}
                                        </button>
                                      );
                                    })}
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 hover:border-amber-400 focus-within:border-amber-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100 transition-all shadow-sm" title="Custom minutes">
                                      <span className="text-[10px] font-black text-slate-400">+</span>
                                      <input
                                        type="number"
                                        min="0"
                                        defaultValue={row.logs[0]?.hcustom_mins || 0}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={(e) => handleMarkHarinam(row.user.email, row.date, 'hcustom_mins', parseInt(e.target.value) || 0)}
                                        className="w-8 sm:w-10 bg-transparent border-none text-center font-black text-[11px] sm:text-xs outline-none text-slate-700 tabular-nums p-0 focus:ring-0 focus:text-amber-600 transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        style={{ MozAppearance: 'textfield' }}
                                      />
                                      <span className="text-[10px] font-black text-slate-400">m</span>
                                    </div>
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="px-6 py-2 text-center text-[10px] font-black text-slate-400 tabular-nums">
                                    <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">#{row.logs[0]?.zk_user_id || "--"}</span>
                                  </td>
                                  <td className="px-6 py-2 text-center text-xs font-bold text-slate-600 tabular-nums">{new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                  <td className="px-6 py-2 text-center text-xs font-black text-indigo-600 tabular-nums">
                                    {row.logs.length > 0 ? (() => {
                                      const earliest = row.logs.reduce((min: any, log: any) =>
                                        (!min.check_time || (log.check_time && new Date(log.check_time) < new Date(min.check_time))) ? log : min
                                        , row.logs[0]);
                                      return formatRawTime(earliest.check_time);
                                    })() : "--:--"}
                                  </td>
                                  <td className="px-6 py-2 last:rounded-r-2xl">
                                    <div className="flex justify-center">
                                      {row.status === 'present' ? (
                                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-emerald-100 shadow-sm"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" /> P</div>
                                      ) : row.status === 'late' ? (
                                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-amber-100 shadow-sm"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]" /> L</div>
                                      ) : (
                                        <div className="flex items-center gap-1.5 bg-rose-50 text-rose-500 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase border border-rose-100"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full opacity-50" /> A</div>
                                      )}
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 shadow-inner bg-slate-50/50 overflow-x-auto overflow-y-hidden custom-attendance-scrollbar relative">
                    <table className="text-left border-separate border-spacing-0" style={{ minWidth: `${140 + (getDateColumns().length * 45)}px` }}>
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] relative sm:sticky sm:left-0 bg-slate-900 z-10 sm:z-20 sm:shadow-[8px_0_15px_-5px_rgba(0,0,0,0.3)] min-w-[120px] sm:min-w-[180px]">Portfolio</th>
                          {getDateColumns().map(date => (
                            <th key={date} className="px-1 sm:px-4 py-4 text-center min-w-[40px] sm:min-w-[50px] border-r border-white/5">
                              <div className="text-[10px] sm:text-xs font-black leading-none mb-1">{new Date(date).toLocaleDateString('en-IN', { day: '2-digit' })}</div>
                              <div className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.1em]">{new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }).charAt(0)}</div>
                            </th>
                          ))}
                          {activeMachine?.id === 'harinam_virtual' ? (
                            <th className="px-2 sm:px-4 py-4 text-center text-[10px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-widest bg-slate-950 shadow-[inset_0_2px_0_#6366f1]">Total Hrs</th>
                          ) : (
                            <>
                              <th className="px-2 sm:px-4 py-4 text-center text-[10px] sm:text-[11px] font-black text-emerald-400 uppercase tracking-widest bg-slate-950 border-r border-white/5 shadow-[inset_0_2px_0_#10b981]">P</th>
                              <th className="px-2 sm:px-4 py-4 text-center text-[10px] sm:text-[11px] font-black text-amber-400 uppercase tracking-widest bg-slate-950 border-r border-white/5 shadow-[inset_0_2px_0_#fbbf24]">L</th>
                              <th className="px-2 sm:px-4 py-4 text-center text-[10px] sm:text-[11px] font-black text-rose-400 uppercase tracking-widest bg-slate-950 border-r border-white/5 shadow-[inset_0_2px_0_#f43f5e]">A</th>
                              <th className="px-2 sm:px-4 py-4 text-center text-[10px] sm:text-[11px] font-black text-indigo-400 uppercase tracking-widest bg-slate-950 shadow-[inset_0_2px_0_#6366f1]">%</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="">
                        {filteredUsers.map((user, uIdx) => {
                          const datesInRange = getDateColumns();
                          let pCount = 0, lCount = 0, aCount = 0;
                          let totalHarinamMins = 0;
                          return (
                            <tr key={user.email} className={`transition-colors group ${uIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-indigo-50/30`}>
                              <td className={`px-6 py-2 relative sm:sticky sm:left-0 z-10 sm:z-30 border-r border-b border-slate-200 sm:shadow-[8px_0_15px_-5px_rgba(0,0,0,0.05)] ${uIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} group-hover:bg-indigo-50`}>
                                <div className="font-black text-slate-800 text-sm sm:text-[15px] tracking-tighter leading-none mb-1 truncate max-w-[150px]">{user.full_name}</div>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[10px] font-black text-slate-400 tabular-nums">#{user.dates[Object.keys(user.dates)[0]]?.[activeMachine?.description]?.[0]?.zk_user_id || '--'}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                                  <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]">{user.email}</span>
                                </div>
                              </td>
                              {datesInRange.map(date => {
                                const logs = (user.dates[date]?.[activeMachine?.description] || []).sort((a: any, b: any) => new Date(a.check_time).getTime() - new Date(b.check_time).getTime());
                                const status = activeMachine ? getStatus(logs, activeMachine) : 'absent';
                                if (status === 'present') pCount++;
                                else if (status === 'late') lCount++;
                                else aCount++;

                                if (activeMachine?.id === 'harinam_virtual' && logs.length > 0) {
                                  totalHarinamMins += (logs[0].h7am || 0) + (logs[0].h740am || 0) + (logs[0].hpdc || 0) + (logs[0].hcustom_mins || 0);
                                }

                                return (
                                  <td key={date} className="px-1 py-1.5 border-r border-b border-slate-100/50 text-center">
                                    {logs.length > 0 ? (
                                      activeMachine?.id === 'harinam_virtual' ? (
                                        (() => {
                                          const mins = (logs[0].h7am || 0) + (logs[0].h740am || 0) + (logs[0].hpdc || 0) + (logs[0].hcustom_mins || 0);
                                          if (mins === 0) return <div className="w-1 h-1 mx-auto bg-slate-200 rounded-full opacity-20" />;
                                          const hrs = mins / 60;
                                          return <div className="font-black text-indigo-600 text-[10px] sm:text-[11px] whitespace-nowrap">{hrs % 1 === 0 ? hrs : hrs.toFixed(1)} hr</div>;
                                        })()
                                      ) : (
                                        <div className="flex flex-col items-center justify-center gap-0.5">
                                          <div className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto rounded-lg flex items-center justify-center font-black text-[10px] sm:text-[11px] transition-all transform hover:scale-110 shadow-sm ${status === 'present' ? 'bg-emerald-500 text-white shadow-emerald-200' :
                                            status === 'late' ? 'bg-amber-400 text-white shadow-amber-200' :
                                              'bg-rose-400 text-white'
                                            }`}>
                                            {status === 'present' ? 'P' : status === 'late' ? 'L' : 'A'}
                                          </div>
                                          {logs.length > 0 && status !== 'absent' && (
                                            <span className="text-[10px] font-black text-slate-500 tracking-tighter tabular-nums leading-none mt-0.5">
                                              {(() => {
                                                const earliest = logs.reduce((min: any, log: any) =>
                                                  (!min.check_time || (log.check_time && new Date(log.check_time) < new Date(min.check_time))) ? log : min
                                                  , logs[0]);
                                                return formatRawTime(earliest.check_time);
                                              })()}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    ) : <div className="w-1 h-1 mx-auto bg-slate-200 rounded-full opacity-20" />}
                                  </td>
                                );
                              })}
                              {activeMachine?.id === 'harinam_virtual' ? (
                                <td className="px-4 py-2 text-center border-b border-slate-200 bg-indigo-500/5 shadow-[inset_0_-2px_0_#6366f122]">
                                  <div className="inline-flex flex-col items-center">
                                    <span className="text-xs sm:text-[13px] font-black text-indigo-600 leading-none">
                                      {(totalHarinamMins / 60) % 1 === 0 ? (totalHarinamMins / 60) : (totalHarinamMins / 60).toFixed(1)} hr
                                    </span>
                                  </div>
                                </td>
                              ) : (
                                <>
                                  <td className="px-4 py-2 text-center border-b border-r border-slate-200 bg-emerald-500/5 font-black text-emerald-600 text-xs sm:text-[13px] shadow-[inset_0_-2px_0_#10b98122]">{pCount}</td>
                                  <td className="px-4 py-2 text-center border-b border-r border-slate-200 bg-amber-500/5 font-black text-amber-600 text-xs sm:text-[13px] shadow-[inset_0_-2px_0_#fbbf2422]">{lCount}</td>
                                  <td className="px-4 py-2 text-center border-b border-r border-slate-200 bg-rose-500/5 font-black text-rose-500 text-xs sm:text-[13px] shadow-[inset_0_-2px_0_#f43f5e22]">{aCount}</td>
                                  <td className="px-4 py-2 text-center border-b border-slate-200 bg-indigo-500/5 shadow-[inset_0_-2px_0_#6366f122]">
                                    <div className="inline-flex flex-col items-center">
                                      <span className="text-xs sm:text-[13px] font-black text-indigo-600 leading-none">{Math.round(((pCount + lCount) / datesInRange.length) * 100)}%</span>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === "config" ? (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="p-6 sm:px-8 sm:py-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[60px] group-hover:scale-110 transition-transform duration-1000"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="text-left w-full md:w-auto">
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tighter font-outfit mb-1">Command Center</h3>
                    <p className="text-indigo-200 font-bold text-xs opacity-80 leading-tight">Define session windows, telemetry rules, and biometric status windows.</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex-1 md:flex-none bg-white/5 px-6 py-2 rounded-xl backdrop-blur-md border border-white/10 text-center">
                      <div className="text-lg font-black leading-none mb-0.5">{machines.length}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest opacity-40">Devices</div>
                    </div>
                    <div className="flex-1 md:flex-none bg-indigo-600 px-6 py-2 rounded-xl backdrop-blur-md border border-indigo-400 text-center shadow-lg shadow-indigo-500/20">
                      <div className="text-lg font-black leading-none mb-0.5">{machines.filter(m => m.p_start).length}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest opacity-80 text-white">Configs</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
                {!isAdding ? (
                  <button onClick={() => setIsAdding(true)} className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] sm:rounded-[3rem] border-4 border-dashed border-slate-200 p-6 sm:p-10 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-white hover:shadow-2xl transition-all group min-h-[250px] sm:min-h-[400px]">
                    <div className="w-14 h-14 sm:w-20 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-xl shadow-indigo-100/50"><Plus className="w-8 h-8 text-indigo-600" /></div>
                    <div className="text-center">
                      <h4 className="font-black text-slate-800 text-xl sm:text-2xl tracking-tighter">Deploy New Session</h4>
                      <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1 max-w-[240px]">New hardware mapping or virtual session container.</p>
                    </div>
                  </button>
                ) : (
                  <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-slate-200 shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] p-6 sm:p-10 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-indigo-900 text-2xl tracking-tighter">New Engine Config</h4>
                      <button onClick={() => setIsAdding(false)} className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"><XCircle className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Attendance Target Name</label>
                        <div className="relative">
                          <Star className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                          <input type="text" value={newMachine.description} onChange={(e) => setNewMachine({ ...newMachine, description: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 pl-16 pr-8 py-5 rounded-3xl outline-none font-bold text-slate-800 focus:bg-white focus:ring-8 focus:ring-indigo-50 transition-all shadow-inner" placeholder="e.g. Mangal Aarti Main Gate" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-6">Biometric Node (S/N)</label>
                        <div className="relative">
                          <HardDrive className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <select value={newMachine.serial_number} onChange={(e) => setNewMachine({ ...newMachine, serial_number: e.target.value })} className="w-full bg-slate-50/50 border border-slate-200 pl-16 pr-10 py-5 rounded-3xl outline-none font-bold text-slate-800 appearance-none focus:bg-white transition-all shadow-inner">
                            <option value="">Select Target Device...</option>
                            {machines.map(m => <option key={m.id} value={m.serial_number}>{m.serial_number} {m.description ? `(${m.description})` : ""}</option>)}
                          </select>
                          <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 rotate-90" />
                        </div>
                      </div>
                      <div className="space-y-6 pt-6 border-t border-slate-50">
                        <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> Telemetry Window Constraints</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                          <div className="space-y-2"><label className="text-[9px] font-black text-emerald-600/50 uppercase tracking-widest ml-4">Present Range</label><div className="flex flex-col sm:flex-row gap-2"><input type="time" value={newMachine.p_start} onChange={(e) => setNewMachine({ ...newMachine, p_start: e.target.value })} className="flex-1 w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl font-bold text-sm shadow-inner" /><input type="time" value={newMachine.p_end} onChange={(e) => setNewMachine({ ...newMachine, p_end: e.target.value })} className="flex-1 w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl font-bold text-sm shadow-inner" /></div></div>
                          <div className="space-y-2"><label className="text-[9px] font-black text-amber-600/50 uppercase tracking-widest ml-4">Late Range</label><div className="flex flex-col sm:flex-row gap-2"><input type="time" value={newMachine.l_start} onChange={(e) => setNewMachine({ ...newMachine, l_start: e.target.value })} className="flex-1 w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl font-bold text-sm shadow-inner" /><input type="time" value={newMachine.l_end} onChange={(e) => setNewMachine({ ...newMachine, l_end: e.target.value })} className="flex-1 w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl font-bold text-sm shadow-inner" /></div></div>
                        </div>
                      </div>
                      <button onClick={handleAddMachine} className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-black py-6 rounded-[2.5rem] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] transition-all uppercase tracking-widest text-xs mt-4">Save Engine Config</button>
                    </div>
                  </div>
                )}
                {machines.filter(m => m.p_start && m.p_end).map((m, idx) => <SessionCard key={m.id} m={m} idx={idx} sessionIcons={sessionIcons} handleDeleteMachine={handleDeleteMachine} handleUpdateMachine={handleUpdateMachine} getSessionLabel={getSessionLabel} />)}
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in slide-in-from-right-10 duration-700 w-full">
              <div className="bg-white/95 backdrop-blur-3xl p-6 sm:px-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full relative z-50">
                <div className="w-full md:w-auto">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tighter font-outfit text-slate-900 leading-none mb-1.5 break-words">{displayUser?.full_name}</h3>
                  <p className="text-slate-500 font-bold text-xs sm:text-sm tracking-tight break-all">{displayUser?.email}</p>
                </div>

                {/* Date Range Navigator */}
                <div className="flex flex-nowrap md:justify-center items-center gap-2 sm:gap-3 w-full md:w-auto flex-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                  {/* Week / Month toggle */}
                  <div className="flex shrink-0 items-center p-1 bg-slate-100/60 rounded-xl border border-slate-200/60 shadow-inner">
                    {(['week', 'month'] as const).map(r => (
                      <button key={r} onClick={() => setHistoryRange(r)}
                        className={`px-3 sm:px-4 py-1.5 rounded-lg font-black text-[10px] sm:text-xs uppercase tracking-tight transition-all ${historyRange === r ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  {/* Prev / Date label / Next */}
                  <div className="flex shrink-0 items-center bg-white rounded-xl border border-slate-100 shadow-sm gap-1 p-1">
                    <button onClick={() => {
                      const d = parseLocalDate(historyPivot);
                      if (historyRange === 'week') d.setDate(d.getDate() - 7);
                      else d.setMonth(d.getMonth() - 1);
                      setHistoryPivot(toLocalDateStr(d));
                    }} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all active:scale-90">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="relative flex items-center justify-center px-4 py-1.5 bg-indigo-50/30 border border-indigo-100/30 rounded-lg cursor-pointer group/hdate">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                      <span className="text-xs font-black text-slate-700 tracking-tight group-hover/hdate:text-indigo-600 transition-colors whitespace-nowrap">
                        {(() => {
                          const pivot = parseLocalDate(historyPivot);
                          if (historyRange === 'week') {
                            const day = pivot.getDay();
                            const diff = pivot.getDate() - day + (day === 0 ? -6 : 1);
                            const start = new Date(pivot.getFullYear(), pivot.getMonth(), diff);
                            const end = new Date(pivot.getFullYear(), pivot.getMonth(), diff + 6);
                            return `${start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`;
                          }
                          return pivot.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        })()}
                      </span>
                      <input type="date" value={historyPivot} onChange={e => setHistoryPivot(e.target.value)} className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10" />
                    </div>
                    <button onClick={() => {
                      const d = parseLocalDate(historyPivot);
                      if (historyRange === 'week') d.setDate(d.getDate() + 7);
                      else d.setMonth(d.getMonth() + 1);
                      setHistoryPivot(toLocalDateStr(d));
                    }} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all active:scale-90">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                  {!forceUserView && (
                    <button onClick={() => setViewMode("matrix")} className="flex items-center justify-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px] bg-indigo-50 px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition-all shrink-0 w-full sm:w-auto">
                      <ChevronLeft className="w-4 h-4" /> Back to Matrix
                    </button>
                  )}
                  {isAdmin && !forceUserView && (
                    <div className="relative flex items-center w-full sm:w-72 group/hsearch">
                      <Search className="absolute left-3.5 w-4 h-4 text-slate-400 group-focus-within/hsearch:text-indigo-600 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={historySearchQuery}
                        onChange={(e) => { setHistorySearchQuery(e.target.value); setShowUserDropdown(true); }}
                        onFocus={() => setShowUserDropdown(true)}
                        className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl outline-none font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                      />

                      {showUserDropdown && historySearchQuery.length > 0 && (
                        <div className="absolute top-full left-0 sm:right-0 sm:left-auto w-full sm:w-80 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[200] p-2 space-y-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          {report.filter(u =>
                            u.full_name?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
                            u.email?.toLowerCase().includes(historySearchQuery.toLowerCase())
                          ).slice(0, 6).map((u) => (
                            <button
                              key={u.email}
                              onClick={() => {
                                setSelectedUserEmail(u.email);
                                setHistorySearchQuery("");
                                setShowUserDropdown(false);
                              }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-[10px] text-indigo-600 border border-indigo-100">{u.full_name?.[0]?.toUpperCase()}</div>
                              <div>
                                <div className="text-[11px] font-black text-slate-900 leading-none">{u.full_name}</div>
                                <div className="text-[9px] font-bold text-slate-400 mt-1">{u.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] mt-8 border border-slate-100 w-full overflow-hidden">
                <div className="overflow-x-auto overflow-y-hidden custom-attendance-scrollbar w-full">
                  <table className="w-full text-left border-separate border-spacing-0 min-w-0">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="px-3 sm:px-6 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] relative sm:sticky sm:left-0 bg-slate-900 z-10 sm:z-30 sm:shadow-[8px_0_15px_-5px_rgba(0,0,0,0.3)] min-w-[90px] sm:min-w-[120px]">Timeline</th>
                        {machines.map(m => {
                          const label = getSessionLabel(m.description);
                          const config = sessionIcons[label] || sessionIcons.default;
                          return (
                            <th key={m.id} className="px-2 sm:px-6 py-3 sm:py-5 text-center border-l border-white/5 min-w-0">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className={`p-1 sm:p-1.5 rounded-lg bg-white/10 ${config.color}`}>
                                  <config.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                                </div>
                                <span className="text-[7px] sm:text-[11px] font-black uppercase tracking-tight sm:tracking-widest leading-none mt-0.5">{label}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="">
                      {(() => {
                        // Compute the date range for history view
                        const pivot = parseLocalDate(historyPivot);
                        let hStart: Date, hEnd: Date;
                        if (historyRange === 'week') {
                          const day = pivot.getDay();
                          const diff = pivot.getDate() - day + (day === 0 ? -6 : 1);
                          hStart = new Date(pivot.getFullYear(), pivot.getMonth(), diff);
                          hEnd = new Date(pivot.getFullYear(), pivot.getMonth(), diff + 6);
                        } else {
                          hStart = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
                          hEnd = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
                        }
                        const hStartStr = toLocalDateStr(hStart);
                        const hEndStr = toLocalDateStr(hEnd);
                        const filteredEntries = Object.entries(displayUser?.dates || {})
                          .filter(([date]) => date >= hStartStr && date <= hEndStr)
                          .sort(([a], [b]) => b.localeCompare(a));
                        if (filteredEntries.length === 0) return (
                          <tr><td colSpan={machines.length + 1} className="py-16 text-center text-slate-300 font-black uppercase text-xs italic opacity-40">No records in this period</td></tr>
                        );
                        return filteredEntries.map(([date, sessions]: [string, any], idx) => (
                          <tr key={date} className={`transition-colors group hover:bg-slate-50/80 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                            <td className={`px-3 sm:px-6 py-2 sm:py-4 relative sm:sticky sm:left-0 z-10 sm:z-20 border-r border-b border-slate-100 sm:shadow-[8px_0_15px_-5px_rgba(0,0,0,0.02)] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} group-hover:bg-slate-50/95`}>
                              <div className="font-black text-slate-900 text-[11px] sm:text-[15px] tracking-tight sm:tracking-tighter uppercase font-outfit whitespace-nowrap">
                                {new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                                <span className="hidden sm:inline">, {new Date(date).toLocaleDateString('en-US', { year: 'numeric' })}</span>
                              </div>
                              <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </td>
                            {machines.map(m => {
                              const logs = sessions[m.description] || [];
                              const status = getStatus(logs, m);

                              let renderContent;
                              if (m.id === 'harinam_virtual') {
                                let dailyHarinamMins = 0;
                                if (logs[0]) {
                                  dailyHarinamMins = (logs[0].h7am || 0) + (logs[0].h740am || 0) + (logs[0].hpdc || 0) + (logs[0].hcustom_mins || 0);
                                }
                                if (dailyHarinamMins > 0) {
                                  const hrsStr = dailyHarinamMins % 60 === 0 ? (dailyHarinamMins / 60).toString() : (dailyHarinamMins / 60).toFixed(1);
                                  renderContent = <div className="font-black text-indigo-600 bg-indigo-50 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[11px] tracking-tight sm:tracking-widest border border-indigo-100 shadow-sm mx-auto w-fit">{hrsStr}hr</div>;
                                } else {
                                  renderContent = <div className="text-slate-300 font-black text-[8px] sm:text-[10px] opacity-40">--</div>;
                                }
                              } else {
                                const earliest = logs.reduce((min: any, log: any) =>
                                  (!min.check_time || (log.check_time && new Date(log.check_time) < new Date(min.check_time))) ? log : min
                                  , logs[0]);

                                if (earliest?.is_manual) {
                                  renderContent = <div className="flex items-center justify-center gap-1 font-black text-indigo-600 bg-indigo-50 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] uppercase border border-indigo-100 shadow-sm mx-auto w-fit">Manual</div>;
                                } else if (status === 'present') {
                                  renderContent = <div className="flex items-center justify-center gap-1 font-black text-emerald-600 bg-emerald-50 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] uppercase border border-emerald-100 shadow-sm mx-auto w-fit"><span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span> {formatRawTime(earliest?.check_time)}</div>;
                                } else if (status === 'late') {
                                  renderContent = <div className="flex items-center justify-center gap-1 font-black text-amber-600 bg-amber-50 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[8px] sm:text-[10px] uppercase border border-amber-100 shadow-sm mx-auto w-fit"><span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></span> {formatRawTime(earliest?.check_time)}</div>;
                                } else {
                                  renderContent = <div className="flex items-center justify-center font-black text-slate-300 text-[8px] sm:text-[10px] uppercase mx-auto w-fit opacity-40">--</div>;
                                }
                              }

                              return (
                                <td key={m.id} className="px-1 sm:px-2 py-2 sm:py-4 text-center border-l border-b border-slate-100/50">
                                  {renderContent}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                    <tfoot>
                      {(() => {
                        // Re-compute range for totals
                        const pivot = parseLocalDate(historyPivot);
                        let hStart: Date, hEnd: Date;
                        if (historyRange === 'week') {
                          const day = pivot.getDay();
                          const diff = pivot.getDate() - day + (day === 0 ? -6 : 1);
                          hStart = new Date(pivot.getFullYear(), pivot.getMonth(), diff);
                          hEnd = new Date(pivot.getFullYear(), pivot.getMonth(), diff + 6);
                        } else {
                          hStart = new Date(pivot.getFullYear(), pivot.getMonth(), 1);
                          hEnd = new Date(pivot.getFullYear(), pivot.getMonth() + 1, 0);
                        }
                        const hStartStr = toLocalDateStr(hStart);
                        const hEndStr = toLocalDateStr(hEnd);
                        const filteredEntries = Object.entries(displayUser?.dates || {})
                          .filter(([date]) => date >= hStartStr && date <= hEndStr);
                        if (filteredEntries.length === 0) return null;
                        // Compute per-machine totals
                        const totals: Record<string, { present: number; late: number; harinamMins: number }> = {};
                        machines.forEach(m => { totals[m.id] = { present: 0, late: 0, harinamMins: 0 }; });
                        filteredEntries.forEach(([, sessions]: [string, any]) => {
                          machines.forEach(m => {
                            const logs = (sessions[m.description] || []);
                            if (m.id === 'harinam_virtual') {
                              if (logs[0]) totals[m.id].harinamMins += (logs[0].h7am || 0) + (logs[0].h740am || 0) + (logs[0].hpdc || 0) + (logs[0].hcustom_mins || 0);
                            } else {
                              const st = getStatus(logs, m);
                              if (st === 'present') totals[m.id].present++;
                              else if (st === 'late') totals[m.id].late++;
                            }
                          });
                        });
                        return (
                          <tr className="bg-slate-900 text-white">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Total
                            </td>
                            {machines.map(m => {
                              const t = totals[m.id];
                              return (
                                <td key={m.id} className="px-1 sm:px-2 py-3 sm:py-4 text-center border-l border-white/5">
                                  {m.id === 'harinam_virtual' ? (
                                    <div className="font-black text-indigo-300 text-[9px] sm:text-[13px]">
                                      {t.harinamMins === 0 ? '--' : `${t.harinamMins % 60 === 0 ? t.harinamMins / 60 : (t.harinamMins / 60).toFixed(1)} hr`}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="font-black text-emerald-400 text-[9px] sm:text-[13px]">{t.present}P</span>
                                      {t.late > 0 && <span className="font-black text-amber-400 text-[8px] sm:text-[11px]">{t.late}L</span>}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ m, idx, sessionIcons, handleDeleteMachine, handleUpdateMachine, getSessionLabel }: any) {
  const [localData, setLocalData] = React.useState(m);
  const [hasChanges, setHasChanges] = React.useState(false);
  const config = sessionIcons[getSessionLabel(m.description)] || sessionIcons.default;

  React.useEffect(() => { setLocalData(m); setHasChanges(false); }, [m]);
  const handleChange = (updates: any) => { setLocalData({ ...localData, ...updates }); setHasChanges(true); };
  const handleSave = () => { handleUpdateMachine(m.id, localData); setHasChanges(false); };

  return (
    <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] p-6 sm:p-8 space-y-6 sm:space-y-8 group hover:border-indigo-300 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 ${config.bg} rounded-[1rem] sm:rounded-[1.5rem] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform shrink-0`}>
            <Monitor className={`w-6 h-6 sm:w-8 sm:h-8 ${config.color}`} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-lg sm:text-2xl tracking-tighter">Session Node {idx + 1}</h4>
            <p className="text-[9px] sm:text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-0.5 sm:mt-1 leading-none">Telemetry Logic Config</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {hasChanges && <button onClick={handleSave} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all"><CheckCircle2 className="w-4 h-4" /> Sync</button>}
          <button onClick={() => handleDeleteMachine(m.id)} className="w-10 h-10 sm:w-14 sm:h-14 bg-rose-50 text-rose-300 hover:bg-rose-500 hover:text-white rounded-lg sm:rounded-2xl flex items-center justify-center transition-all shadow-sm" title="Remove Session"><Trash2 className="w-4 h-4 sm:w-6 sm:h-6" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Display Label</label>
          <input type="text" value={localData.description} onChange={(e) => handleChange({ description: e.target.value })} className="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-800 transition-all shadow-inner text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Hardware Identifier</label>
          <div className="w-full bg-slate-100/50 border border-slate-200 px-6 py-3.5 rounded-2xl font-black text-slate-400 uppercase tabular-nums opacity-50 relative overflow-hidden text-sm">
            {localData.serial_number}
            <div className="absolute top-0 right-0 h-full w-1 bg-indigo-500/20" />
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h5 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2"><Star className="w-3.5 h-3.5 text-amber-400" /> Qualification Windows</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] shadow-inner">
          {[
            { label: 'Start P', key: 'p_start', color: 'text-emerald-600' },
            { label: 'End P', key: 'p_end', color: 'text-emerald-600' },
            { label: 'Start L', key: 'l_start', color: 'text-amber-600' },
            { label: 'End L', key: 'l_end', color: 'text-amber-600' }
          ].map((win) => (
            <div key={win.key} className="space-y-1 text-center">
              <label className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">{win.label}</label>
              <input type="time" value={localData[win.key] || ""} onChange={(e) => handleChange({ [win.key]: e.target.value })} className={`w-full bg-white border border-slate-100 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black transition-all focus:ring-4 focus:ring-indigo-100 outline-none shadow-sm ${win.color}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Telemetry Rules</span>
          <div className="flex items-center gap-2 bg-indigo-50 px-2 py-0.5 rounded-full"><Activity className="w-2.5 h-2.5 text-indigo-500" /><span className="text-[8px] font-bold text-indigo-600">Active</span></div>
        </div>
        <div className="h-4 w-full bg-slate-100 rounded-full flex overflow-hidden shadow-inner p-0.5">
          <div className="h-full bg-emerald-500 w-[30%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest rounded-full shadow-lg">P</div>
          <div className="h-full bg-amber-500 w-[40%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest mx-0.5 rounded-full shadow-lg">L</div>
          <div className="h-full bg-rose-400 w-[30%] flex items-center justify-center text-[7px] text-white font-black uppercase tracking-widest rounded-full shadow-lg">A</div>
        </div>
        <div className="flex justify-between mt-3 text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tabular-nums">
          <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-600">{localData.p_start?.slice(0, 5) || "--:--"}</span>
          <span className="bg-indigo-50 flex items-center px-1.5 py-0.5 rounded text-indigo-400">Rules Engine</span>
          <span className="bg-rose-50 px-1.5 py-0.5 rounded text-rose-500">{localData.l_end?.slice(0, 5) || "--:--"}</span>
        </div>
      </div>
    </div>
  );
}
