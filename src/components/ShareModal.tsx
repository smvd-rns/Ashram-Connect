"use client";

import React, { useState } from "react";
import { X, Copy, Mail, MessageCircle, Check, Share2, Send, Globe } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-emerald-500",
      link: `https://wa.me/?text=${encodeURIComponent(title + ": " + url)}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-blue-500",
      link: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Check out this spiritual lecture: " + url)}`,
    },
    {
      name: "Twitter",
      icon: Send,
      color: "bg-sky-500",
      link: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "Facebook",
      icon: Globe,
      color: "bg-indigo-600",
      link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-white/20 p-6 sm:p-8 animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full" />
        <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-32 h-32 bg-orange-500/10 blur-[40px] rounded-full" />

        <div className="relative space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shadow-sm">
                <Share2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                  Share Wisdom
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Spread the message
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Direct Link Copy */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Lecture Link
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  readOnly 
                  value={url}
                  className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-500 outline-none focus:bg-white transition-all shadow-inner"
                />
                <button 
                  onClick={handleCopy}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                    copied ? "bg-emerald-500 text-white" : "bg-white text-indigo-600 shadow-sm hover:bg-indigo-50"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Social Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {shareOptions.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group"
                >
                  <div className={`w-8 h-8 ${opt.color} rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">
                    {opt.name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="pt-2 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Devotional Library Ecosystem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
