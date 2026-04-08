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

  useEffect(() => {
    loadUsers();
  }, [session?.access_token]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u: any) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [users, search]);

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
      setSelected([]);
    } catch (err) {
      console.error(err);
      alert("Failed to mark selected users. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
            Attendance Incharge
          </h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Bulk Mark Harinam
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
            className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Mark As
          </label>
          <select
            value={markType}
            onChange={(e) => setMarkType(e.target.value as HarinamType)}
            className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all cursor-pointer appearance-none"
          >
            <option value="h7am">7:00 AM</option>
            <option value="h740am">7:40 AM</option>
            <option value="hpdc">PDC</option>
            <option value="hcustom_mins">Custom Minutes</option>
          </select>
        </div>

        {markType === "hcustom_mins" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Custom Minutes
            </label>
            <input
              type="number"
              min={0}
              value={customMins}
              onChange={(e) => setCustomMins(parseInt(e.target.value || "0", 10))}
              className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
        )}

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
              className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100"
            >
              Select Filtered
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200"
            >
              Clear
            </button>
            <span className="text-[10px] font-black text-slate-400 ml-auto">
              {selected.length} selected
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/40 divide-y divide-slate-100">
            {loadingUsers ? (
              <div className="py-6 flex items-center justify-center text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-6 text-center text-[11px] font-bold text-slate-400">
                No users found
              </div>
            ) : (
              filteredUsers.map((u: any) => {
                const checked = selected.includes(u.email);
                return (
                  <label
                    key={u.email}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleUser(u.email)}
                      className="accent-indigo-600"
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-slate-800 truncate">
                        {u.full_name}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 truncate">
                        {u.email}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={submitting || selected.length === 0}
          onClick={handleSubmit}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
            submitting || selected.length === 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-slate-900 shadow-lg shadow-indigo-100 active:scale-95"
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
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

