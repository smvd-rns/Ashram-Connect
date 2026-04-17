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
    <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/20 p-6 sm:p-10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-48 h-48 bg-devo-500/10 blur-[60px] rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-accent-gold/10 blur-[60px] rounded-full" />

        <button 
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative text-center space-y-4 sm:space-y-6">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-tr from-devo-50 to-devo-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-sm ring-4 ring-white">
            <ShieldAlert className="w-6 h-6 sm:w-8 h-8 text-devo-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-outfit font-black text-devo-950 tracking-tight leading-tight">
              Ashram <span className="text-devo-600">Media Policy</span>
            </h2>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-devo-400 opacity-60">Restricted Device Access</p>
          </div>

          <div className="bg-slate-50/50 p-5 sm:p-7 rounded-[1.5rem] border border-slate-100 text-left">
            <p className="text-xs sm:text-base text-slate-700 font-medium leading-relaxed">
              As per our <span className="font-bold text-devo-950 italic">Temple Policy</span>, external YouTube navigation is restricted to maintain a focused spiritual atmosphere.
            </p>
            <div className="mt-4 flex items-start gap-3">
              <div className="mt-0.5 p-1 bg-devo-500/10 rounded">
                <BookOpen className="w-3.5 h-3.5 text-devo-600" />
              </div>
              <p className="text-[11px] sm:text-sm text-slate-500 font-bold leading-normal">
                Please continue your journey within this curated library.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-6 py-3.5 sm:py-4 bg-devo-950 text-white rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl hover:shadow-devo-500/20 active:scale-95"
            >
              Stay in Library
            </button>
          </div>

          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
            Official Media Compliance
          </p>
        </div>
      </div>
    </div>
  );
}
