"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, Clock, CheckCircle, Loader2, Mail } from "lucide-react";

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
}

export default function NotificationsHistoryList({ limit = 10 }: { limit?: number }) {
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (data) setHistory(data);
    } catch (err) {
      console.error("History fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Subscribe to new notifications in real-time
    const channel = supabase
      .channel('public_notifications_history')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications_history' }, 
        (payload) => {
          setHistory(prev => [payload.new as NotificationRecord, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-purple-200" />
        <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-xs">Loading updates...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Mail className="w-8 h-8 text-slate-200" />
        </div>
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs sm:text-sm italic">No recent broadcasts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <div 
          key={item.id} 
          className="group bg-white p-6 sm:p-8 rounded-[2rem] border-2 border-slate-100 transition-all hover:border-purple-200 hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-1"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex gap-5 items-start flex-1 min-w-0">
               <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center shrink-0 border border-purple-100 group-hover:bg-purple-600 group-hover:border-purple-600 transition-all duration-500">
                  <Bell className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
               </div>
               <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Announcement</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <h4 className="text-base sm:text-lg font-black font-outfit text-slate-900 tracking-tight leading-snug group-hover:text-purple-700 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm font-medium text-slate-500 mt-2 leading-relaxed break-words">
                    {item.body}
                  </p>
                  {item.url && item.url !== '/' && (
                    <a 
                      href={item.url} 
                      className="inline-flex items-center gap-2 mt-4 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:gap-3 transition-all"
                    >
                      View Linked Page
                      <CheckCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
               </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
