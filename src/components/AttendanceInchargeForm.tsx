"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Loader2, Search, Users } from "lucide-react";

interface AttendanceInchargeFormProps {
  session: any;
  onSuccess?: () => void;
}

type HarinamType = "h7am" | "h740am" | "hpdc" | "hcustom_mins";

export default function AttendanceInchargeForm({
  session,
  onSuccess,
}: AttendanceInchargeFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [markType, setMarkType] = useState<HarinamType>("h7am");
  const [customMins, setCustomMins] = useState(15);
  const [harinamRecords, setHarinamRecords] = useState<Record<string, any>>({});
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showOnlyMarked, setShowOnlyMarked] = useState(false);

  const loadUsers = async () => {
    if (!session?.access_token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/attendance/users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      const list = (data?.users || [])
        .filter((u: any) => !!u?.email)
        .sort((a: any, b: any) =>
          (a.full_name || "").localeCompare(b.full_name || ""),
        );
      setUsers(list);
    } catch (err) {
      console.error("Failed to load users for incharge marking:", err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadHarinamRecords = async () => {
    if (!session?.access_token || !date) return;
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/admin/harinam?date=${date}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      const records = (data?.records || []).reduce((acc: any, r: any) => {
        acc[r.user_email] = r;
        return acc;
      }, {});
      setHarinamRecords(records);
    } catch (err) {
      console.error("Failed to load harinam records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [session?.access_token]);

  useEffect(() => {
    loadHarinamRecords();
  }, [session?.access_token, date]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (showOnlyMarked) {
      list = list.filter((u: any) => {
        const record = harinamRecords[u.email];
        if (!record) return false;
        // If "Only Marked" is on, show users marked for the CURRENTLY selected slot
        return (record[markType] || 0) > 0;
      });
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
  }, [users, search, showOnlyMarked, harinamRecords, markType]);

  const toggleUser = (email: string) => {
    setSelected((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email],
    );
  };

  const selectAllFiltered = () => {
    const emails = filteredUsers.map((u: any) => u.email);
    setSelected((prev) => Array.from(new Set([...prev, ...emails])));
  };

  const clearSelection = () => setSelected([]);

  const handleSubmit = async () => {
    if (!selected.length || !session?.access_token) return;
    setSubmitting(true);
    try {
      const valueMap: Record<HarinamType, number> = {
        h7am: 30,
        h740am: 30,
        hpdc: 90,
        hcustom_mins: Math.max(0, Number(customMins) || 0),
      };
      const update = { [markType]: valueMap[markType] };

      const res = await fetch("/api/admin/harinam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "bulk_update_harinam",
          data: { emails: selected, date, update },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to mark attendance");
      }

      if (onSuccess) onSuccess();
      await loadHarinamRecords();
      setSelected([]);
    } catch (err) {
      console.error(err);
      alert("Failed to mark selected users. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-emerald-100 p-6 sm:p-8 rounded-[2.5rem] border-2 border-emerald-200 shadow-xl shadow-emerald-300/20 relative overflow-hidden group transition-all hover:bg-emerald-200/40">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
            Attendance Incharge
          </h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Bulk Marking Record
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Harinam Slot
            </label>
            <select
              value={markType}
              onChange={(e) => setMarkType(e.target.value as HarinamType)}
              className="w-full text-xs font-bold p-3 bg-white border border-emerald-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="h7am">7:00 AM Slot</option>
              <option value="h740am">7:40 AM Slot</option>
              <option value="hpdc">PDC Slot</option>
              <option value="hcustom_mins">Custom Minutes</option>
            </select>
          </div>
        </div>

        {markType === "hcustom_mins" && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Minutes to assign
            </label>
            <input
              type="number"
              value={customMins}
              onChange={(e) => setCustomMins(parseInt(e.target.value || "0", 10))}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Search Users
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-white border border-emerald-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
            >
              Select Filtered
            </button>
            <button
              onClick={() => setShowOnlyMarked(!showOnlyMarked)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${showOnlyMarked ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-100 text-blue-600 hover:border-blue-200"}`}
            >
              {showOnlyMarked ? "Show All" : "Only Marked"}
            </button>
            <span className="text-[10px] font-black text-slate-400 ml-auto">
              {selected.length} selected
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/40 divide-y divide-slate-100 custom-attendance-scrollbar">
            {loadingUsers ? (
              <div className="py-6 flex items-center justify-center text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-[11px] font-bold text-slate-400">
                No users match your search
              </div>
            ) : (
              filteredUsers.map((u: any) => {
                const isSelected = selected.includes(u.email);
                const record = harinamRecords[u.email];
                const markedSlots: string[] = [];
                if (record?.h7am > 0) markedSlots.push("7AM");
                if (record?.h740am > 0) markedSlots.push("7:40AM");
                if (record?.hpdc > 0) markedSlots.push("PDC");
                if (record?.hcustom_mins > 0) markedSlots.push("Custom");
                
                const isMarked = markedSlots.length > 0;

                return (
                  <div
                    key={u.email}
                    onClick={() => toggleUser(u.email)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-white cursor-pointer transition-all ${
                      isMarked 
                        ? "bg-blue-50/80 border-y border-blue-100/50" 
                        : "bg-transparent"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected ? "bg-emerald-600 border-emerald-600 shadow-sm" : "bg-white border-slate-200"}`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`text-[13px] font-black truncate ${isMarked ? "text-blue-900" : "text-slate-800"}`}>
                          {u.full_name}
                        </div>
                        {isMarked && (
                          <div className="flex flex-wrap gap-1">
                            {markedSlots.map(slot => (
                              <div key={slot} className="px-1.5 py-0.5 bg-blue-600 text-white text-[7px] font-black rounded-md uppercase animate-in fade-in zoom-in duration-300">
                                {slot}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`text-[11px] font-bold truncate ${isMarked ? "text-blue-400" : "text-slate-400"}`}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={submitting || selected.length === 0}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${submitting || selected.length === 0
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 text-white hover:bg-slate-900 shadow-lg shadow-emerald-100 active:scale-95"
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

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
