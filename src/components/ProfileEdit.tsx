"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Phone, MapPin, X, Save, CheckCircle, LogOut, Cpu, Link, Lock } from "lucide-react";

interface ProfileEditProps {
  session: any;
  profile: any;
  isBcdb: boolean;
  onUpdate: () => Promise<void>;
  onClose: () => void;
}

const MAPPING_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL
let mappingCache: {
  userId: string;
  isBcdb: boolean;
  machines: any[];
  mappings: any[];
  fetchedAt: number;
} | null = null;

export default function ProfileEdit({ session, profile, isBcdb, onUpdate, onClose }: ProfileEditProps) {
  const [name, setName] = useState(profile?.full_name || "");
  const [mobile, setMobile] = useState(profile?.mobile || "");
  const [temple, setTemple] = useState(profile?.temple || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Biometric machine mapping states
  const [machines, setMachines] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [isBcdbVerified, setIsBcdbVerified] = useState(false);
  const [machineInputs, setMachineInputs] = useState<Record<string, string>>({});
  const [mappingErrors, setMappingErrors] = useState<Record<string, string>>({});
  const [submittingMachines, setSubmittingMachines] = useState<Record<string, boolean>>({});

  // Sync state if profile data arrives late
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setName(profile.full_name);
      if (profile.mobile) setMobile(profile.mobile);
      if (profile.temple) setTemple(profile.temple);
    }
  }, [profile]);

  // Fetch machines and mappings if user is BCDB registered
  useEffect(() => {
    if (isBcdb && session?.access_token) {
      const now = Date.now();
      const currentUserId = session?.user?.id || "";
      
      // Use cached data if available and fresh
      if (
        mappingCache && 
        mappingCache.userId === currentUserId && 
        (now - mappingCache.fetchedAt < MAPPING_CACHE_TTL_MS)
      ) {
        setIsBcdbVerified(mappingCache.isBcdb);
        setMachines(mappingCache.machines);
        setMappings(mappingCache.mappings);
        
        const initialInputs: Record<string, string> = {};
        mappingCache.mappings.forEach((m: any) => {
          initialInputs[m.machine_id] = m.zk_user_id;
        });
        setMachineInputs(initialInputs);
        return;
      }

      const fetchMachinesAndMappings = async () => {
        setLoadingMachines(true);
        try {
          // Added ?v=1 to bypass browser-cached 308 Permanent Redirect from earlier trailingSlash config
          const res = await fetch("/api/user/attendance-mapping?v=1", {
            headers: {
              "Authorization": `Bearer ${session.access_token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isBcdb) {
              setIsBcdbVerified(true);
              const fetchedMachines = data.machines || [];
              const fetchedMappings = data.mappings || [];
              setMachines(fetchedMachines);
              setMappings(fetchedMappings);
              
              // Prefill machineInputs with existing mappings
              const initialInputs: Record<string, string> = {};
              fetchedMappings.forEach((m: any) => {
                initialInputs[m.machine_id] = m.zk_user_id;
              });
              setMachineInputs(initialInputs);

              // Update Cache
              mappingCache = {
                userId: currentUserId,
                isBcdb: true,
                machines: fetchedMachines,
                mappings: fetchedMappings,
                fetchedAt: Date.now()
              };
            } else {
              setIsBcdbVerified(false);
              mappingCache = {
                userId: currentUserId,
                isBcdb: false,
                machines: [],
                mappings: [],
                fetchedAt: Date.now()
              };
            }
          } else {
            setIsBcdbVerified(false);
          }
        } catch (err) {
          console.error("Error fetching machines/mappings:", err);
          setIsBcdbVerified(false);
        } finally {
          setLoadingMachines(false);
        }
      };
      fetchMachinesAndMappings();
    }
  }, [isBcdb, session]);

  const handleLinkMachine = async (machineId: string) => {
    const zkUserId = machineInputs[machineId]?.trim();
    if (!zkUserId) {
      setMappingErrors(prev => ({ ...prev, [machineId]: "ID cannot be empty" }));
      return;
    }

    setSubmittingMachines(prev => ({ ...prev, [machineId]: true }));
    setMappingErrors(prev => ({ ...prev, [machineId]: "" }));

    try {
      const res = await fetch("/api/user/attendance-mapping?v=1", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ machineId, zkUserId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to link machine");
      }

      setMappings(prev => {
        const nextMappings = [...prev, data.mapping];
        if (mappingCache && mappingCache.userId === (session?.user?.id || "")) {
          mappingCache.mappings = nextMappings;
        }
        return nextMappings;
      });
    } catch (err: any) {
      setMappingErrors(prev => ({ ...prev, [machineId]: err.message }));
    } finally {
      setSubmittingMachines(prev => ({ ...prev, [machineId]: false }));
    }
  };

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
      <div className="bg-white w-full max-w-md rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="relative p-6 sm:p-10 overflow-y-auto flex-1">
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

            {isBcdb && (isBcdbVerified || loadingMachines) && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h3 className="text-xs font-outfit font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-devo-500" />
                    Biometric Machine Mapping
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Link your physical machine ID for attendance recording
                  </p>
                </div>

                {loadingMachines ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-devo-500" />
                    Loading machines...
                  </div>
                ) : machines.length === 0 ? (
                  <div className="text-[10px] text-slate-400 font-bold uppercase py-2 bg-slate-50 rounded-xl text-center">
                    No active physical machines found.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {machines.map((machine) => {
                      const existing = mappings.find(m => m.machine_id === machine.id);
                      const isMapped = !!existing;
                      const zkUserId = machineInputs[machine.id] || "";
                      const errorMsg = mappingErrors[machine.id];
                      const isSubmitting = submittingMachines[machine.id];

                      return (
                        <div key={machine.id} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-700 truncate max-w-[200px]" title={machine.description}>
                              {machine.description}
                            </span>
                            {isMapped ? (
                              <span className="flex items-center gap-1 text-[9px] font-black text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                <Lock className="w-2.5 h-2.5" /> Mapped
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Unlinked
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              disabled={isMapped || isSubmitting}
                              placeholder={isMapped ? "Mapped ID" : "Enter Machine ID (e.g. 104)"}
                              value={zkUserId}
                              onChange={(e) => setMachineInputs(prev => ({ ...prev, [machine.id]: e.target.value }))}
                              className={`flex-1 px-3 py-2 border rounded-xl outline-none font-bold text-xs transition-all ${
                                isMapped
                                  ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                  : "bg-white border-slate-200 focus:border-devo-500 placeholder:text-slate-300"
                              }`}
                            />
                            {!isMapped && (
                              <button
                                type="button"
                                disabled={isSubmitting || !zkUserId.trim()}
                                onClick={() => handleLinkMachine(machine.id)}
                                className="px-3 bg-devo-600 hover:bg-devo-700 text-white font-black text-[10px] rounded-xl uppercase tracking-wider disabled:bg-slate-200 disabled:text-slate-400 active:scale-95 transition-all flex items-center gap-1"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Link className="w-3 h-3" />
                                )}
                                Link
                              </button>
                            )}
                          </div>

                          {errorMsg && (
                            <p className="text-[9px] font-black text-red-600 uppercase tracking-wider">
                              {errorMsg}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
