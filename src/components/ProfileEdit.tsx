"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Phone, MapPin, X, Save, CheckCircle, LogOut } from "lucide-react";

interface ProfileEditProps {
  session: any;
  profile: any;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

export default function ProfileEdit({ session, profile, onUpdate, onClose }: ProfileEditProps) {
  const [name, setName] = useState(profile?.full_name || "");
  const [mobile, setMobile] = useState(profile?.mobile || "");
  const [temple, setTemple] = useState(profile?.temple || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Sync state if profile data arrives late
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setName(profile.full_name);
      if (profile.mobile) setMobile(profile.mobile);
      if (profile.temple) setTemple(profile.temple);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("/api/admin/profile", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          full_name: name,
          mobile,
          temple
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      await onUpdate();
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="relative p-6 sm:p-10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-slate-300 hover:text-devo-600 hover:bg-devo-50 rounded-full transition-all"
          >
            <X className="w-5 h-5 sm:w-6 h-6" />
          </button>

          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-devo-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-devo-600 shadow-inner">
              <User className="w-7 h-7 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-xl sm:text-3xl font-outfit font-black text-devo-950 tracking-tight">My Profile</h2>
            <p className="text-slate-400 font-bold text-[10px] sm:text-sm mt-1 uppercase tracking-widest">Account Settings</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 text-red-700 text-[10px] sm:text-xs font-bold rounded-xl border border-red-100 animate-shake">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 sm:p-4 bg-green-50 text-green-700 text-[10px] sm:text-xs font-bold rounded-xl border border-green-100 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-devo-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 bg-slate-50/50 border-2 border-slate-100 focus:border-devo-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none font-bold text-sm sm:text-base transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-devo-500 transition-colors" />
                <input 
                  type="tel" 
                  required
                  placeholder="Mobile Number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 bg-slate-50/50 border-2 border-slate-100 focus:border-devo-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none font-bold text-sm sm:text-base transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-focus-within:text-devo-500 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Temple / Center Name"
                  value={temple}
                  onChange={(e) => setTemple(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-6 py-3 sm:py-4 bg-slate-50/50 border-2 border-slate-100 focus:border-devo-500 focus:bg-white rounded-xl sm:rounded-2xl outline-none font-bold text-sm sm:text-base transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <button 
              disabled={isSubmitting || success}
              className="w-full bg-gradient-to-r from-devo-600 to-devo-800 hover:from-devo-700 hover:to-black text-white font-black py-4 sm:py-5 rounded-xl sm:rounded-2xl shadow-xl shadow-devo-100 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest uppercase text-[10px] sm:text-xs"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 sm:w-5 sm:h-5" /> Save Changes</>}
            </button>

            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button 
                type="button"
                onClick={async () => { 
                  const { supabase } = await import("@/lib/supabase");
                  await supabase.auth.signOut(); 
                  window.location.href = "/"; 
                }}
                className="text-red-400 hover:text-red-600 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 hover:scale-105 transition-all"
              >
                <LogOut className="w-3 h-3 sm:w-4 h-4" /> Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
