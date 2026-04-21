"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface AttendanceExceptionFormProps {
  userEmail: string;
  onSuccess?: () => void;
}

export default function AttendanceExceptionForm({ userEmail, onSuccess }: AttendanceExceptionFormProps) {
  const [reportingReason, setReportingReason] = useState('Sick');
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportingStart, setReportingStart] = useState(todayStr);
  const [reportingEnd, setReportingEnd] = useState(todayStr);
  const [reportingComment, setReportingComment] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>(["All"]);
  const [isSubmittingException, setIsSubmittingException] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);

  const availableSessions = ["Mangal Aarti", "SB Class", "BC Class", "Hari Nam"];

  const exceptionConfigs: Record<string, { color: string, label: string, short: string }> = {
    'Sick': { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Sick', short: 'SK' },
    'Seva': { color: 'text-indigo-600 bg-indigo-50 border-indigo-100', label: 'Seva', short: 'SV' },
    'Out of Station': { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Out Station', short: 'OS' },
    'In Center': { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'In Center', short: 'IC' },
    'Forgot': { color: 'text-slate-600 bg-slate-50 border-slate-100', label: 'Forgot', short: 'FG' },
    'Late Night Seva': { color: 'text-purple-600 bg-purple-50 border-purple-100', label: 'Late Seva', short: 'LN' },
    'Other': { color: 'text-rose-600 bg-rose-50 border-rose-100', label: 'Other', short: 'OT' }
  };

  const handleReportException = async () => {
    if (!userEmail) return;
    setIsSubmittingException(true);
    try {
      const effectiveEndDate = useDateRange ? reportingEnd : reportingStart;
      const res = await fetch('/api/attendance/exception', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: userEmail,
          startDate: reportingStart,
          endDate: effectiveEndDate,
          reason_type: reportingReason,
          comment: reportingComment,
          applied_sessions: selectedSessions
        })
      });
      if (!res.ok) throw new Error('Failed to report exception');
      setReportingComment('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmittingException(false);
    }
  };

  return (
    <div className="bg-rose-100 p-6 sm:p-8 rounded-[2.5rem] border-2 border-rose-200 shadow-xl shadow-rose-300/20 relative overflow-hidden group transition-all hover:bg-rose-200/40">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">Report Exception</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reason for Absence</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Start Date</label>
            <input
              type="date"
              value={reportingStart}
              onChange={(e) => {
                const next = e.target.value;
                setReportingStart(next);
                // Default to single-day behavior unless the user explicitly enables range.
                if (!useDateRange) setReportingEnd(next);
              }}
              className="w-full text-xs font-bold p-3 bg-white border border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
            />
          </div>
          {useDateRange ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">End Date</label>
              <input
                type="date"
                value={reportingEnd}
                onChange={(e) => setReportingEnd(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-white border border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
              />
            </div>
          ) : (
            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={() => {
                  setUseDateRange(true);
                  setReportingEnd(reportingStart);
                }}
                className="w-full text-left text-[10px] font-black uppercase tracking-widest px-1 py-3 bg-white border border-rose-100 rounded-2xl text-slate-500 hover:text-slate-700 hover:border-rose-200 transition-all"
              >
                Use date range
              </button>
            </div>
          )}
        </div>
        {useDateRange && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setUseDateRange(false)}
              className="text-[10px] font-black uppercase tracking-widest px-1 py-1 text-rose-700 hover:text-rose-900"
            >
              Mark only one day
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Applied To Sessions</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSessions(["All"])}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                selectedSessions.includes("All")
                  ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-100"
                  : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300"
              }`}
            >
              All Sessions
            </button>
            {availableSessions.map((s) => {
              const isActive = selectedSessions.includes(s) && !selectedSessions.includes("All");
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (selectedSessions.includes("All")) {
                      setSelectedSessions([s]);
                    } else {
                      setSelectedSessions((prev) =>
                        prev.includes(s)
                          ? prev.filter((item) => item !== s)
                          : [...prev, s]
                      );
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                    isActive
                      ? "bg-rose-100 border-rose-200 text-rose-700"
                      : "bg-white border-rose-100 text-slate-400 hover:border-rose-200"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>


        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reason Type</label>
          <select 
            value={reportingReason} 
            onChange={e => setReportingReason(e.target.value)} 
            className="w-full text-xs font-bold p-3 bg-white border border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all cursor-pointer appearance-none"
          >
            {Object.keys(exceptionConfigs).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Detailed Comment</label>
          <textarea 
            value={reportingComment} 
            onChange={e => setReportingComment(e.target.value)} 
            placeholder="Help the community understand why you missed the session..." 
            className="w-full text-xs font-bold p-4 bg-white border border-rose-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all h-24 resize-none placeholder:text-slate-300" 
          />
        </div>

        <button 
          disabled={isSubmittingException}
          onClick={handleReportException}
          className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
            isSubmittingException 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-rose-600 text-white hover:bg-slate-900 shadow-lg shadow-rose-100 active:scale-95'
          }`}
        >
          {isSubmittingException ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Submit Record Exception'}
        </button>
      </div>
      
      {/* Decorative gradient overlay */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-rose-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
