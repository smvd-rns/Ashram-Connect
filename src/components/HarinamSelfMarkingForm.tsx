"use client";

import React, { useState } from "react";
import { Clock, MapPin, Send, Loader2, Sparkles } from "lucide-react";

interface HarinamSelfMarkingFormProps {
  session: any;
  onSuccess?: () => void;
}

export default function HarinamSelfMarkingForm({
  session,
  onSuccess,
}: HarinamSelfMarkingFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [mins, setMins] = useState(30);
  const [place, setPlace] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/harinam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "self_update_harinam",
          data: {
            date,
            hcustom_mins: Number(mins),
            hcustom_place: place,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to mark Harinam");
      }

      setPlace("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-100 p-6 sm:p-8 rounded-[2.5rem] border-2 border-amber-200 shadow-xl shadow-amber-300/20 relative overflow-hidden transition-all hover:bg-amber-200/40 group">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
            Self Harinam
          </h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Personal Custom Record
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs font-bold p-3 bg-white border border-amber-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Minutes
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                required
                min={0}
                value={mins}
                onChange={(e) => setMins(parseInt(e.target.value || "0", 10))}
                className="w-full pl-9 pr-3 py-3 text-xs font-bold bg-white border border-amber-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-1">
              Place <span className="text-amber-600 text-[8px]">(Required)</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Where?"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-xs font-bold bg-white border border-amber-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
            submitting
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-amber-600 text-white hover:bg-slate-900 shadow-lg shadow-amber-100 active:scale-95"
          }`}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Submit Harinam
        </button>
      </form>

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
