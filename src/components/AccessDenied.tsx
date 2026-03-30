"use client";

import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AccessDenied() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-white/80 backdrop-blur-2xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(249,115,22,0.15)] border border-white ring-1 ring-slate-200 max-w-xl w-full text-center space-y-8">
        
        {/* Humble Icon Container */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-50 to-orange-100 rounded-[2rem] sm:rounded-[2.5rem] rotate-6 animate-pulse"></div>
          <div className="relative w-full h-full bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-sm flex items-center justify-center border border-orange-100">
            <ShieldAlert className="w-10 h-10 sm:w-16 sm:h-16 text-orange-400" strokeWidth={1.5} />
          </div>
        </div>

        {/* Humble Messaging */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-outfit font-black text-slate-900 tracking-tight leading-tight">
            A Humble <span className="text-orange-500">Restriction</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base leading-relaxed px-2">
            We deeply respect your presence in our community. However, this particular sanctuary is currently reserved for administrators. 
          </p>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
              Administrative Clearance Required
            </span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
          <button 
            onClick={() => router.push("/")}
            className="flex-[2] flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold py-5 rounded-2xl transition-all shadow-xl shadow-orange-100 active:scale-[0.98] text-sm sm:text-lg"
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6" /> Return to Home
          </button>
          
          <button 
            onClick={() => router.back()}
            className="flex-grow flex items-center justify-center gap-2 border-2 border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-50 font-black py-5 rounded-2xl transition-all text-[10px] sm:text-xs uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>

        <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.4em]">
          Thank you for your understanding
        </p>
      </div>
    </div>
  );
}
