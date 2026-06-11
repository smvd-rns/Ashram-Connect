"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Trash2, Check, ShieldAlert, X } from "lucide-react";

interface AttendanceExceptionFormProps {
  userEmail: string;
  session: any;
  onSuccess?: () => void;
}

export default function AttendanceExceptionForm({ userEmail, session, onSuccess }: AttendanceExceptionFormProps) {
  const [reportingReason, setReportingReason] = useState('Sick');
  const todayStr = new Date().toISOString().split('T')[0];
  const [reportingStart, setReportingStart] = useState(todayStr);
  const [reportingEnd, setReportingEnd] = useState(todayStr);
  const [reportingComment, setReportingComment] = useState("");
  const [selectedSessions, setSelectedSessions] = useState<string[]>(["All"]);
  const [isSubmittingException, setIsSubmittingException] = useState(false);
  const [useDateRange, setUseDateRange] = useState(false);
  const [recentExceptions, setRecentExceptions] = useState<any[]>([]);
  const [isLoadingExceptions, setIsLoadingExceptions] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Bulk Selection and custom confirm modal states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; targetId?: string }>({
    isOpen: false,
    type: 'single'
  });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const fetchRecentExceptions = async () => {
    if (!userEmail) return;
    setIsLoadingExceptions(true);
    try {
      const headers: Record<string, string> = {};
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/attendance/exception?email=${encodeURIComponent(userEmail)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setRecentExceptions(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching exceptions:", err);
    } finally {
      setIsLoadingExceptions(false);
    }
  };

  useEffect(() => {
    fetchRecentExceptions();
  }, [userEmail]);

  const initiateDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'single',
      targetId: id
    });
  };

  const initiateBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'bulk'
    });
  };

  const executeDelete = async () => {
    const { type, targetId } = confirmModal;
    setConfirmModal({ isOpen: false, type: 'single' });

    const headers: Record<string, string> = {};
    if (session) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    if (type === 'single') {
      if (!targetId) return;
      setIsDeletingId(targetId);
      try {
        const res = await fetch(`/api/attendance/exception?id=${targetId}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) throw new Error('Failed to delete exception');
        setSelectedIds(prev => prev.filter(x => x !== targetId));
        fetchRecentExceptions();
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
        alert('Failed to remove exception. Please try again.');
      } finally {
        setIsDeletingId(null);
      }
    } else {
      // Bulk delete
      setIsBulkDeleting(true);
      try {
        const idsString = selectedIds.join(",");
        const res = await fetch(`/api/attendance/exception?id=${idsString}`, {
          method: 'DELETE',
          headers
        });
        if (!res.ok) throw new Error('Failed to delete exceptions');
        setSelectedIds([]);
        fetchRecentExceptions();
        if (onSuccess) onSuccess();
      } catch (err) {
        console.error(err);
        alert('Failed to remove selected exceptions. Please try again.');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const handleReportException = async () => {
    if (!userEmail) return;
    setIsSubmittingException(true);
    try {
      const effectiveEndDate = useDateRange ? reportingEnd : reportingStart;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/attendance/exception', {
        method: 'POST',
        headers,
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
      fetchRecentExceptions();
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

        {/* Recent Exceptions List */}
        {recentExceptions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-rose-200/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.length === recentExceptions.length) {
                      setSelectedIds([]);
                    } else {
                      setSelectedIds(recentExceptions.map(ex => ex.id));
                    }
                  }}
                  className="w-4 h-4 rounded border border-rose-300 bg-white flex items-center justify-center transition-all hover:border-rose-500 focus:outline-none"
                >
                  {selectedIds.length === recentExceptions.length && (
                    <Check className="w-3 h-3 text-rose-600 stroke-[3]" />
                  )}
                </button>
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select All</h5>
              </div>

              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={initiateBulkDelete}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-rose-100"
                >
                  {isBulkDeleting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Delete Selected ({selectedIds.length})
                </button>
              ) : (
                <span className="bg-rose-50 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">{recentExceptions.length} Total</span>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {recentExceptions.map((ex) => {
                const cfg = exceptionConfigs[ex.reason_type] || exceptionConfigs.Other;
                const isSelected = selectedIds.includes(ex.id);
                return (
                  <div key={ex.id} className={`bg-white border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all hover:shadow-md hover:shadow-rose-100/30 group ${isSelected ? 'border-rose-300 bg-rose-50/10' : 'border-rose-100'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(prev => 
                            prev.includes(ex.id) 
                              ? prev.filter(x => x !== ex.id) 
                              : [...prev, ex.id]
                          );
                        }}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all focus:outline-none shrink-0 ${isSelected ? 'border-rose-500 bg-rose-600' : 'border-rose-200 bg-white hover:border-rose-400'}`}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        )}
                      </button>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${cfg.color}`}>
                            {cfg.short}
                          </span>
                          <span className="text-[10px] font-bold text-slate-800">
                            {new Date(ex.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {ex.applied_sessions?.join(", ")}
                          </span>
                        </div>
                        {ex.comment && (
                          <p className="text-[10px] text-slate-500 font-bold leading-snug truncate">
                            {ex.comment}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      disabled={isDeletingId === ex.id}
                      onClick={() => initiateDelete(ex.id)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center shrink-0"
                      title="Remove Exception"
                    >
                      {isDeletingId === ex.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal via Portal */}
      {mounted && confirmModal.isOpen && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] border border-slate-100 p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-5">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto ring-4 ring-white shadow-sm">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                {confirmModal.type === 'bulk' ? 'Remove Selected Exceptions' : 'Remove Reported Exception'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirm Action</p>
            </div>

            <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">
              {confirmModal.type === 'bulk' 
                ? `Are you sure you want to remove the ${selectedIds.length} selected reported exceptions? This action cannot be undone.`
                : 'Are you sure you want to remove this reported exception? This action cannot be undone.'}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-rose-100"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Decorative gradient overlay */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-rose-50/50 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
