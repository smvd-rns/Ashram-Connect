"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, Search, Monitor } from "lucide-react";

interface VirtualMachineAttendanceFormProps {
  session: any;
  onSuccess?: () => void;
}

type AttendanceStatus = "P" | "A";

export default function VirtualMachineAttendanceForm({
  session,
  onSuccess,
}: VirtualMachineAttendanceFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [machineName, setMachineName] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, AttendanceStatus>>({});
  const [existingRecords, setExistingRecords] = useState<Record<string, AttendanceStatus>>({});
  const [showOnlyMarked, setShowOnlyMarked] = useState(false);

  const loadUsers = async () => {
    if (!session?.access_token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/attendance/virtual-machine?date=${date}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      const list = (data?.users || [])
        .filter((u: any) => !!u?.email)
        .sort((a: any, b: any) =>
          (a.full_name || "").localeCompare(b.full_name || ""),
        );
      setUsers(list);
      setMachineName(data?.machine?.description || data?.machine?.serial_number || "");
      
      const records = (data?.records || []).reduce((acc: any, r: any) => {
        acc[r.user_email] = r.status;
        return acc;
      }, {});
      setExistingRecords(records);
    } catch (err) {
      console.error("Failed to load virtual machine users:", err);
      setUsers([]);
      setMachineName("");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [session?.access_token, date]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (showOnlyMarked) {
      list = list.filter((u: any) => !!existingRecords[u.email]);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u: any) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, search, showOnlyMarked, existingRecords]);

  const setUserStatus = (email: string, status: AttendanceStatus) => {
    setSelected((prev) => ({ ...prev, [email]: status }));
  };

  const clearSelection = () => setSelected({});

  const handleSubmit = async () => {
    if (!session?.access_token || Object.keys(selected).length === 0) return;
    setSubmitting(true);
    try {
      const records = Object.entries(selected).map(([email, status]) => ({
        email,
        status,
      }));

      const res = await fetch("/api/attendance/virtual-machine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "bulk_mark_vm_attendance",
          data: { date, records },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to mark attendance");
      }

      if (onSuccess) onSuccess();
      setSelected({});
      loadUsers(); // Refresh to show marked status
    } catch (err) {
      console.error(err);
      alert("Failed to mark selected users. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-sky-100 p-4 sm:p-8 rounded-[2.5rem] border-2 border-sky-200 shadow-xl shadow-sky-300/20 relative overflow-hidden transition-all hover:bg-sky-200/40 group">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
          <Monitor className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
            Virtual Machine Incharge
          </h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Mark P/A {machineName ? `- ${machineName}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs font-bold p-3 bg-white border border-sky-100 rounded-2xl focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Select Users
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-white border border-sky-100 rounded-xl focus:ring-4 focus:ring-sky-500/10 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOnlyMarked(!showOnlyMarked)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${showOnlyMarked ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-100 text-blue-600 hover:border-blue-200"}`}
            >
              {showOnlyMarked ? "Show All" : "Only Marked"}
            </button>
            <span className="text-[10px] font-black text-slate-400 ml-auto">
              {Object.keys(selected).length} marked
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/40 divide-y divide-slate-100">
            {loadingUsers ? (
              <div className="py-6 flex items-center justify-center text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-[11px] font-bold text-slate-400">
                No users mapped for this machine
              </div>
            ) : (
              filteredUsers.map((u: any) => {
                const status = selected[u.email];
                const existingStatus = existingRecords[u.email];
                const isMarked = !!existingStatus;

                return (
                  <div
                    key={u.email}
                    className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-white transition-all ${
                      isMarked ? "bg-blue-50/80 border-y border-blue-100/50" : "bg-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-[13px] font-black truncate ${isMarked ? "text-blue-900" : "text-slate-800"}`}>
                          {u.full_name}
                        </div>
                        {isMarked && (
                          <div className={`px-1.5 py-0.5 text-[8px] font-black rounded-md border animate-in fade-in zoom-in duration-300 ${
                            existingStatus === 'P' 
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                              : "bg-rose-100 text-rose-700 border-rose-200"
                          }`}>
                            {existingStatus === 'P' ? 'PRESENT' : 'ABSENT'}
                          </div>
                        )}
                      </div>
                      <div className={`text-[11px] font-bold truncate ${isMarked ? "text-blue-400" : "text-slate-400"}`}>
                        {u.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setUserStatus(u.email, "P")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${status === "P" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-100"}`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserStatus(u.email, "A")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${status === "A" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-700 border-rose-100"}`}
                      >
                        A
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={submitting || Object.keys(selected).length === 0}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${submitting || Object.keys(selected).length === 0
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-sky-600 text-white hover:bg-slate-900 shadow-lg shadow-sky-100 active:scale-95"
            }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckSquare className="w-4 h-4" />
          )}
          Mark Selected Users
        </button>
      </div>
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-sky-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
