"use client";

import React, { useState, useEffect } from "react";
import { 
  FilePlus, Trash2, ExternalLink, Loader2, 
  AlertCircle, CheckCircle2, FileText, Search,
  Plus, X, HelpCircle
} from "lucide-react";

interface Policy {
  id: string;
  title: string;
  drive_url: string;
  created_at: string;
}

export default function AdminPolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    fetchPolicies();
  }, []);

  async function fetchPolicies() {
    setLoading(true);
    try {
      const res = await fetch("/api/policies");
      const data = await res.json();
      if (res.ok) setPolicies(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, drive_url: newUrl })
      });
      const result = await res.json();

      if (res.ok) {
        setMsg({ type: 'success', text: "Policy added successfully!" });
        setNewTitle("");
        setNewUrl("");
        setShowAddForm(false);
        fetchPolicies();
      } else {
        setMsg({ type: 'error', text: result.error || "Failed to add policy" });
      }
    } catch (err) {
      setMsg({ type: 'error', text: "Network error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this policy?")) return;
    
    try {
      const res = await fetch(`/api/admin/policies?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg({ type: 'success', text: "Policy removed." });
        fetchPolicies();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-32 -mt-32" />
         <div className="relative z-10">
            <h2 className="text-3xl font-black font-outfit tracking-tight uppercase">Policy Management</h2>
            <p className="text-indigo-200/60 font-bold text-sm mt-1">Upload and govern official Ashram guidelines.</p>
         </div>
         <button 
           onClick={() => setShowAddForm(true)}
           className="relative z-10 flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
         >
            <Plus className="w-5 h-5" />
            Add New Policy
         </button>
      </div>

      {msg && (
        <div className={`p-5 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${
          msg.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertCircle className="w-6 h-6 shrink-0" />}
          <span className="font-bold text-sm tracking-tight">{msg.text}</span>
        </div>
      )}

      {/* Grid of existing policies */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
           <FileText className="w-4 h-4" /> Published Documents
        </h3>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 opacity-30">
             <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
             <p className="text-[10px] font-black uppercase tracking-widest">Refreshing Library...</p>
          </div>
        ) : policies.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
             <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">No policies found in the directory</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {policies.map(p => (
               <div key={p.id} className="group p-6 bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 rounded-3xl transition-all flex items-center justify-between gap-4">
                  <div className="min-w-0">
                     <p className="font-black text-slate-900 tracking-tight leading-tight truncate font-outfit uppercase">
                        {p.title}
                     </p>
                     <div className="flex items-center gap-3 mt-1.5 opacity-60">
                        <a href={p.drive_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 hover:underline flex items-center gap-1 uppercase tracking-widest">
                           <ExternalLink className="w-3 h-3" /> Drive Link
                        </a>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                           {new Date(p.created_at).toLocaleDateString()}
                        </span>
                     </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="w-10 h-10 bg-white group-hover:bg-rose-50 text-slate-300 group-hover:text-rose-500 rounded-xl flex items-center justify-center transition-all border border-slate-200 group-hover:border-rose-100 active:scale-90"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Add Policy Side-over/Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <form onSubmit={handleAdd} className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl border border-white/20 p-10 sm:p-14 space-y-8 animate-in zoom-in-95 duration-300 relative">
              <button 
                type="button"
                onClick={() => setShowAddForm(false)} 
                className="absolute top-8 right-8 w-10 h-10 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center">
                 <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-white shadow-sm">
                    <FilePlus className="w-8 h-8 text-indigo-600" />
                 </div>
                 <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-outfit uppercase">New Document</h3>
                 <p className="text-slate-400 font-bold text-xs mt-1">Publish a new PDF policy to the Manual.</p>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-outfit">Document Title</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Ashram Code of Conduct v2"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-800"
                    />
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center justify-between pl-2 pr-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-outfit">Google Drive URL</label>
                      <div className="group relative">
                         <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-indigo-400 cursor-help" />
                         <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-950 text-white text-[9px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none tracking-tight leading-relaxed z-50">
                            Make sure the file is shared as <strong>"Anyone with the link"</strong> can view.
                         </div>
                      </div>
                    </div>
                    <input 
                      type="url" 
                      required 
                      placeholder="https://drive.google.com/file/d/..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-800"
                    />
                 </div>
              </div>

              <button 
                disabled={isSubmitting}
                className="w-full py-5 bg-indigo-600 hover:bg-slate-900 disabled:bg-slate-200 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publish Document"}
              </button>
           </form>
        </div>
      )}
    </div>
  );
}
