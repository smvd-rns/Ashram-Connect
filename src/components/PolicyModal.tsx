"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, X, BookOpen, ExternalLink } from "lucide-react";

export default function PolicyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowPolicy = () => setIsOpen(true);
    window.addEventListener("show-policy", handleShowPolicy);
    return () => window.removeEventListener("show-policy", handleShowPolicy);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-white/90 backdrop-blur-2xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/20 p-8 sm:p-12 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-devo-500/10 blur-[80px] rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-accent-gold/10 blur-[80px] rounded-full" />

        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="relative text-center space-y-6 sm:space-y-8">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-tr from-devo-50 to-devo-100 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm ring-4 ring-white">
            <ShieldAlert className="w-8 h-8 sm:w-12 sm:h-12 text-devo-600" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-4xl font-outfit font-black text-devo-950 tracking-tight leading-tight">
              Ashram <span className="text-devo-600">Media Policy</span>
            </h2>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-devo-400 opacity-60">Spiritual Sanctuary Restricted Access</p>
          </div>

          <div className="bg-slate-50/50 p-6 sm:p-8 rounded-[2rem] border border-slate-100 text-left">
            <p className="text-sm sm:text-lg text-slate-700 font-medium leading-relaxed">
              As per our <span className="font-bold text-devo-950 italic">Temple Policy</span>, external YouTube navigation is restricted to maintain a focused spiritual atmosphere.
            </p>
            <div className="mt-6 flex items-start gap-3">
              <div className="mt-1 p-1 bg-devo-500/10 rounded-md">
                <BookOpen className="w-4 h-4 text-devo-600" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-bold leading-normal">
                Please continue your spiritual journey within this curated library, designed to minimize external distractions.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-8 py-4 sm:py-5 bg-devo-950 text-white rounded-2xl sm:rounded-3xl text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl hover:shadow-devo-500/20 active:scale-95"
            >
              Stay in Library
            </button>
          </div>

          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            Official Media Compliance
          </p>
        </div>
      </div>
    </div>
  );
}
