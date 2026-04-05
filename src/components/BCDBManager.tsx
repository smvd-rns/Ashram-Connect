"use client";

import React, { useState, useEffect } from "react";
import { 
  Loader2, Search, Download, Upload, Plus, Edit2, Trash2, 
  X, CheckCircle2, AlertCircle, Filter, 
  Users, Activity, Star, Calendar, Phone, Mail, MapPin, 
  Trash,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  FileSpreadsheet,
  UserCheck,
  RefreshCcw,
  Eye,
  EyeOff,
  ArrowRightLeft
} from "lucide-react";
import * as XLSX from "xlsx";

interface BCDBManagerProps {
  session: any;
  isAdmin: boolean;
}

export default function BCDBManager({ session, isAdmin }: BCDBManagerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const getGoogleThumbnail = (url: string) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/(?:id=|\/d\/|uc\?id=)([\w-]+)/);
    if (match && match[1]) {
       // Using the more universal direct thumbnail path
       return `https://lh3.googleusercontent.com/d/${match[1]}=s300`;
    }
    return url;
  };

  const getRowColor = (color: string) => {
    switch (color?.toLowerCase()) {
       case 'yellow': return 'bg-yellow-100/40 hover:bg-yellow-200/60';
       case 'saffron': return 'bg-orange-100/50 hover:bg-orange-200/70';
       case 'blue': return 'bg-blue-100/40 hover:bg-blue-200/60';
       case 'white': return 'bg-white hover:bg-slate-50/50';
       default: return 'bg-white hover:bg-slate-50/50';
    }
  };

  const syncScroll = (source: React.RefObject<HTMLDivElement | null>, target: React.RefObject<HTMLDivElement | null>) => {
    if (source.current && target.current) {
      target.current.scrollLeft = source.current.scrollLeft;
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Special handling for nested names in portfolio
        if (sortConfig.key === 'initiated_name') {
          aVal = (a.initiated_name || a.legal_name || "").toLowerCase();
          bVal = (b.initiated_name || b.legal_name || "").toLowerCase();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || "").toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [session, showDeleted, searchQuery]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bcdb?query=${searchQuery}&showDeleted=${showDeleted}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) {
        const text = await res.text();
        try {
           const errJson = JSON.parse(text);
           console.error("BCDB Fetch Error:", errJson.error);
        } catch {
           console.error("BCDB Fetch HTTP Error:", res.status);
        }
        setData([]);
        return;
      }

      const result = await res.json();
      if (result.data) setData(result.data);
    } catch (err) {
      console.error("Fetch BCDB error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleUpsert = async (record: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bcdb", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ action: "upsert", data: record })
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = "Update failed (Server Error)";
        try {
           const errJson = JSON.parse(text);
           errMsg = errJson.error || errMsg;
        } catch {}
        setStatusMsg({ type: 'error', text: errMsg });
        return;
      }

      const result = await res.json();
      if (result.data) {
        setStatusMsg({ type: 'success', text: "Record updated successfully!" });
        setIsEditing(false);
        fetchData();
      }
    } catch (err) {
      console.error("Upsert error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      title: "Confirm Archive",
      message: "Are you sure you want to move this record to archives? You can restore it later.",
      onConfirm: async () => {
        setLoading(true);
        try {
           const res = await fetch(`/api/admin/bcdb?id=${id}`, {
             method: "DELETE",
             headers: { "Authorization": `Bearer ${session.access_token}` }
           });
    
           if (!res.ok) {
             const text = await res.text();
             let errMsg = "Delete failed";
             try {
                const errJson = JSON.parse(text);
                errMsg = errJson.error || errMsg;
             } catch {}
             setStatusMsg({ type: 'error', text: errMsg });
             return;
           }
    
           setStatusMsg({ type: 'success', text: "Record moved to archives." });
           fetchData();
        } catch (err) {
          console.error("Delete error:", err);
          setStatusMsg({ type: 'error', text: "Network error occurred." });
        } finally {
          setLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleRestore = async (id: string) => {
    setConfirmConfig({
      title: "Confirm Restore",
      message: "This will bring the record back from archives. Proceed?",
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/admin/bcdb", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}` 
            },
            body: JSON.stringify({ action: "upsert", data: { id, is_deleted: false } })
          });
    
          if (res.ok) {
            setStatusMsg({ type: 'success', text: "Record restored successfully." });
            fetchData();
          }
        } catch (err) {
          console.error("Restore error:", err);
        } finally {
          setLoading(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  const syncToProfiles = async () => {
    if (!session) return;
    
    setConfirmConfig({
      title: "Confirm Sync",
      message: "This will migrate eligible BCDB records to user profiles. Existing profiles will be skipped. Proceed?",
      onConfirm: async () => {
        setSyncing(true);
        try {
          const res = await fetch("/api/admin/profiles/sync-bcdb", {
            method: "POST",
            headers: { "Authorization": `Bearer ${session.access_token}` }
          });
          
          const result = await res.json();
          if (res.ok) {
            setStatusMsg({ type: 'success', text: result.message || "Sync completed!" });
          } else {
            setStatusMsg({ type: 'error', text: result.error || "Sync failed" });
          }
        } catch (err) {
          console.error("Sync error:", err);
          setStatusMsg({ type: 'error', text: "Network error occurred." });
        } finally {
          setSyncing(false);
          setConfirmConfig(null);
        }
      }
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt: any) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        // Map Excel headers to DB columns
        const mappedData = rawData.map((row: any) => ({
          initiated_name: row["Initiated Name (if initiated)"],
          legal_name: row["Legal Name (as in Adhar Card)"],
          initiation: row["Initiation"],
          colour: row["Colour"],
          spiritual_master: row["Spiritual Master (aspiring, if uninitiated)"],
          dob_adhar: row["Date of birth (as on Adhar Card)"],
          dob_actual: row["Date of birth (Actual)"],
          contact_no: String(row["Contact no"] || ""),
          email_id: row["Email id"] || row["Email Address"],
          counsellor: row["Counsellor"],
          center: row["Center (Based at)"],
          year_joining: parseInt(row["Year of joining"]),
          prasadam: row["Prasadam"],
          primary_services: row["Primary Services"],
          secondary_services: row["Secondary services"],
          blood_group: row["Blood group"],
          aadhar_number: String(row["Aadhar Number(with space after every 4 digits)"] || ""),
          address_adhar: row["Address (as on Adhar Card)"],
          pan_card: row["Pan Card"],
          photo_url: row["Photo"],
          relative_contact_1: row["Relative contact-1 (Relation-Name-Contact)\r\nEx: Father-Arun Sharma-993875834"],
          relative_contact_2: row["Relative contact-2  (Relation-Name-Contact)\r\nEx: Mother-Arati Sharma-973875834"],
          relative_contact_3: row["Relative contact-3  (Relation-Name-Contact)\r\nEx: Brother-Abhay Sharma-973875834"],
          email_address: row["Email Address"],
          adhar_card_copy_url: row["Adhar Card Copy-Upload file with your name Legal OR Initiated\r\n(go to https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en to download pdf by generating otp)"],
          pan_card_copy_url: row["PAN Card Copy"],
          parents_address: row["Parents/Home town Address"],
          whatsapp_no: String(row["WhatsApp No"] || ""),
          custom_counsellor: row["If your counsellor name is not mentioned in the above list, write here"]
        }));

        const res = await fetch("/api/admin/bcdb/import", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}` 
          },
          body: JSON.stringify({ data: mappedData })
        });
        
        if (!res.ok) {
           const text = await res.text();
           let errMsg = "Check SQL and try again. Database might be updating.";
           try {
              const errJson = JSON.parse(text);
              errMsg = errJson.error || errMsg;
           } catch {}
           setStatusMsg({ type: 'error', text: errMsg });
           return;
        }

        const result = await res.json();
        if (result.success) {
           setStatusMsg({ type: 'success', text: `Successfully imported ${result.count} records!` });
           fetchData();
        } else {
           setStatusMsg({ type: 'error', text: result.error || "Import failed." });
        }
      } catch (err: any) {
        console.error("Import error:", err);
        setStatusMsg({ type: 'error', text: "Network Error: Verify server is running on port 3100" });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AshramConnect");
    XLSX.writeFile(wb, `BCDB_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };


  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-none relative">
        
      {/* Header Bar */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-[250px] -mt-[250px] blur-[120px] group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
            <div>
               <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20"><Activity className="w-6 h-6 text-indigo-400" /></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 opacity-60">Master Database</span>
               </div>
               <h2 className="text-3xl sm:text-6xl font-black tracking-tighter font-outfit">BCDB Portal</h2>
               <p className="text-indigo-200 font-bold text-base sm:text-lg opacity-80 mt-2">Manage the NVCC Ashram Connect directory with high-precision synchronization.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
               <div className="flex-1 md:flex-none bg-white/10 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-white/10 text-center">
                  <div className="text-2xl sm:text-3xl font-black leading-none mb-1">{data.length}</div>
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-40">Records</div>
               </div>
               <div className="flex-1 md:flex-none bg-indigo-600 px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-3xl backdrop-blur-md border border-indigo-400 text-center shadow-2xl shadow-indigo-500/20">
                  <div className="text-2xl sm:text-3xl font-black leading-none mb-1">{[...new Set(data.map(d => d.center))].length}</div>
                  <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">Centers</div>
               </div>
            </div>
         </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
         <form onSubmit={handleSearch} className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 transition-colors group-focus-within:text-indigo-600" />
            <input type="text" placeholder="Search by name, email, center or contact..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white/50 backdrop-blur-xl border-2 border-white rounded-[2rem] focus:ring-[12px] focus:ring-indigo-100/50 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] placeholder:text-slate-300" />
         </form>

         <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
            <label className="flex-1 lg:flex-none">
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
              <div className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer shadow-sm">
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="hidden sm:inline">Import Excel</span><span className="sm:hidden">Import</span>
              </div>
            </label>
            <button onClick={handleExport} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
               <Download className="w-5 h-5 text-indigo-400" />
               <span className="hidden sm:inline">Export Master</span><span className="sm:hidden">Export</span>
            </button>
            <button onClick={() => { setSelectedRecord({}); setIsEditing(true); }} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-200">
               <Plus className="w-5 h-5" />
               Add New
            </button>
            <button 
              onClick={syncToProfiles} 
              disabled={syncing}
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-emerald-600 text-white px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
            >
               {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
               <span className="hidden sm:inline">Sync to Profiles</span><span className="sm:hidden">Sync PF</span>
            </button>
            <button 
              onClick={() => setShowDeleted(!showDeleted)} 
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all ${
                showDeleted ? 'bg-rose-100 text-rose-600 border-2 border-rose-200' : 'bg-slate-100 text-slate-500 border-2 border-transparent'
              }`}
            >
               {showDeleted ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
               <span className="hidden sm:inline">{showDeleted ? "Hide Deleted" : "Show Deleted"}</span><span className="sm:hidden">{showDeleted ? "Hide" : "Archived"}</span>
            </button>
         </div>
      </div>


      {/* Top Synchronized Scrollbar */}
      <div 
        ref={topScrollRef}
        onScroll={() => syncScroll(topScrollRef, tableContainerRef)}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-200 scrollbar-track-transparent bg-white/30 backdrop-blur-sm rounded-full mx-4"
      >
         <div className="h-1 min-w-[4000px]"></div>
      </div>

      {/* Swipe Overlay Hint for Mobile */}
      <div className="lg:hidden flex items-center justify-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
         <ArrowRightLeft className="w-4 h-4" />
         Swipe to explore database
      </div>

      {/* Main Table View */}
      <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white shadow-[0_40px_80px_-24px_rgba(0,0,0,0.08)] overflow-hidden">
         <div 
            ref={tableContainerRef}
            onScroll={() => syncScroll(tableContainerRef, topScrollRef)}
            className="overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-100 scrollbar-track-transparent [webkit-overflow-scrolling:touch]"
         >
            <table className="w-full text-left border-collapse min-w-[1500px] lg:min-w-[4000px]">
               <thead>
                  <tr className="bg-slate-900 text-white">
                     <th onClick={() => requestSort('initiated_name')} className="md:sticky left-0 z-20 bg-slate-900 px-4 md:px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[160px] md:min-w-[350px] cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                           Devotee Portfolio
                           {sortConfig?.key === 'initiated_name' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronLeft className="w-3 h-3 rotate-90" />)}
                        </div>
                     </th>
                     <th onClick={() => requestSort('colour')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[120px] cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                           Color
                           {sortConfig?.key === 'colour' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronLeft className="w-3 h-3 rotate-90" />)}
                        </div>
                     </th>
                     <th onClick={() => requestSort('initiation')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                           Initiation
                           {sortConfig?.key === 'initiation' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronLeft className="w-3 h-3 rotate-90" />)}
                        </div>
                     </th>
                     <th onClick={() => requestSort('center')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[180px] cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                           Center
                           {sortConfig?.key === 'center' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronLeft className="w-3 h-3 rotate-90" />)}
                        </div>
                     </th>
                     <th onClick={() => requestSort('counsellor')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px] cursor-pointer hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-2">
                           Counsellor
                           {sortConfig?.key === 'counsellor' && (sortConfig.direction === 'asc' ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronLeft className="w-3 h-3 rotate-90" />)}
                        </div>
                     </th>
                     <th onClick={() => requestSort('whatsapp_no')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">
                        WhatsApp
                        {sortConfig?.key === 'whatsapp_no' && (sortConfig.direction === 'asc' ? " Ã¢â€ â€˜" : " Ã¢â€ â€œ")}
                     </th>
                     <th onClick={() => requestSort('contact_no')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[180px] cursor-pointer hover:bg-slate-800 transition-colors">
                        Phone
                        {sortConfig?.key === 'contact_no' && (sortConfig.direction === 'asc' ? " Ã¢â€ â€˜" : " Ã¢â€ â€œ")}
                     </th>
                     <th onClick={() => requestSort('email_id')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px] cursor-pointer hover:bg-slate-800 transition-colors">
                        Email ID
                        {sortConfig?.key === 'email_id' && (sortConfig.direction === 'asc' ? " Ã¢â€ â€˜" : " Ã¢â€ â€œ")}
                     </th>
                     <th onClick={() => requestSort('blood_group')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">
                        Blood
                        {sortConfig?.key === 'blood_group' && (sortConfig.direction === 'asc' ? " Ã¢â€ â€˜" : " Ã¢â€ â€œ")}
                     </th>
                     <th onClick={() => requestSort('dob_adhar')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">DOB (Adhar)</th>
                     <th onClick={() => requestSort('dob_actual')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">DOB (Actual)</th>
                     <th onClick={() => requestSort('pan_card')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px] cursor-pointer hover:bg-slate-800 transition-colors">Pan Card No</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Primary Services</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Secondary Services</th>
                     <th onClick={() => requestSort('spiritual_master')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px] cursor-pointer hover:bg-slate-800 transition-colors">Spiritual Master</th>
                     <th onClick={() => requestSort('year_joining')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[120px] cursor-pointer hover:bg-slate-800 transition-colors">Year joined</th>
                     <th onClick={() => requestSort('aadhar_number')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px] cursor-pointer hover:bg-slate-800 transition-colors">Aadhar No</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Relative 1</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Relative 2</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Relative 3</th>
                     <th onClick={() => requestSort('prasadam')} className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px] cursor-pointer hover:bg-slate-800 transition-colors">Prasadam</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Address (Adhar)</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Home Address</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px]">Adhar Copy</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[200px]">Pan Copy</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[250px]">Custom Counsellor</th>
                     <th className="px-8 py-6 text-xs font-black uppercase tracking-[0.2em] min-w-[150px]">Manage</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {loading && data.length === 0 ? (
                    <tr><td colSpan={25} className="py-32 text-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto opacity-20" /></td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={25} className="py-32 text-center text-slate-300 font-black uppercase tracking-widest italic opacity-40">No Records Found Matching Criteria</td></tr>
                  ) : (
                     sortedData.map((r, i) => (
                                               <tr 
                          key={r.id || i} 
                          className={`group transition-colors relative ${getRowColor(r.colour)} ${r.is_deleted ? 'opacity-50 grayscale-[0.5]' : ''}`}
                        >
                          {r.is_deleted && (
                             <div className="absolute inset-0 bg-rose-50/10 pointer-events-none z-0"></div>
                          )}

                         <td 
                            onClick={() => { setSelectedRecord(r); setIsEditing(true); }}
                            className={`md:sticky left-0 z-10 backdrop-blur-sm shadow-[4px_0_15px_-4px_rgba(0,0,0,0.05)] px-4 md:px-8 py-5 transition-colors cursor-pointer hover:bg-slate-50/50 ${getRowColor(r.colour).split(' ')[0]}`}
                         >
                            <div className="flex items-center gap-3 md:gap-4">
                               <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-2xl shadow-inner group-hover:rotate-3 transition-all relative overflow-hidden flex-shrink-0 ${
                                 r.colour?.toLowerCase() === 'blue' ? 'bg-blue-200 text-blue-900' : 
                                 r.colour?.toLowerCase() === 'yellow' ? 'bg-yellow-300 text-yellow-900 font-black' :
                                 r.colour?.toLowerCase() === 'saffron' ? 'bg-orange-300 text-orange-900 font-black' :
                                 'bg-slate-200 text-slate-800'
                               }`}>
                                 {r.photo_url && (
                                   <img 
                                     src={getGoogleThumbnail(r.photo_url) || ""} 
                                     alt="Devotee" 
                                     className="absolute inset-0 w-full h-full object-cover z-20"
                                     onError={(e: any) => { e.target.style.display = 'none'; }}
                                   />
                                 )}
                                 <span className="relative z-10">{r.initiated_name?.[0] || r.legal_name?.[0] || "?"}</span>
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                 <div className="font-black text-slate-800 text-sm md:text-[17px] leading-tight tracking-tight whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                                   {r.initiated_name || "Uninitiated"}
                                 </div>
                                 <div className="hidden md:block text-slate-400 font-bold text-xs uppercase tracking-[0.15em] mt-0.5 whitespace-nowrap overflow-hidden text-overflow-ellipsis">
                                   {r.legal_name}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${r.colour === 'Blue' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                              <span className="text-xs font-bold text-slate-500 uppercase">{r.colour || "-"}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className={`inline-flex px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border ${
                             r.initiation === '1st' || r.initiation === '2nd' 
                               ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                               : 'bg-slate-50 text-slate-400 border-slate-100'
                           }`}>
                              {r.initiation || "-"}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2 text-slate-600 font-bold text-sm uppercase tracking-tight">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                              {r.center || "-"}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                              {r.counsellor || "-"}
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-emerald-600 font-black text-sm tabular-nums">{r.whatsapp_no || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-bold text-sm tabular-nums whitespace-nowrap">{r.contact_no || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-indigo-400 font-bold text-xs lowercase tabular-nums whitespace-nowrap">{r.email_id || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center font-black text-rose-600 text-xs uppercase">{r.blood_group || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-bold text-[11px] tabular-nums">{r.dob_adhar || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-bold text-[11px] tabular-nums">{r.dob_actual || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-600 font-black text-xs uppercase tracking-wider">{r.pan_card || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-bold text-[11px] leading-relaxed max-w-[200px] line-clamp-2">{r.primary_services || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-[11px] leading-relaxed max-w-[200px] line-clamp-2">{r.secondary_services || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-indigo-600 font-black text-[11px] italic underline decoration-indigo-200">{r.spiritual_master || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-600 font-black text-sm">{r.year_joining || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-[11px] tabular-nums tracking-wide">{r.aadhar_number || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-medium text-[10px] leading-snug">{r.relative_contact_1 || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-medium text-[10px] leading-snug">{r.relative_contact_2 || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-medium text-[10px] leading-snug">{r.relative_contact_3 || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-500 font-black text-[10px] uppercase tracking-widest">{r.prasadam || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-[10px] leading-relaxed max-w-[220px] line-clamp-1 hover:line-clamp-none transition-all">{r.address_adhar || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-[10px] leading-relaxed max-w-[220px] line-clamp-1 hover:line-clamp-none transition-all">{r.parents_address || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           {r.adhar_card_copy_url ? (
                             <a href={r.adhar_card_copy_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1">
                                <Download className="w-3 h-3" /> View Adhar
                             </a>
                           ) : "-"}
                        </td>
                        <td className="px-8 py-5">
                           {r.pan_card_copy_url ? (
                             <a href={r.pan_card_copy_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1">
                                <Download className="w-3 h-3" /> View Pan
                             </a>
                           ) : "-"}
                        </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-xs italic">{r.custom_counsellor || "-"}</div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => { setSelectedRecord(r); setIsEditing(true); }} className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all flex items-center justify-center shadow-sm">
                                 <Edit2 className="w-4 h-4" />
                              </button>
                              {r.is_deleted ? (
                                <button onClick={() => handleRestore(r.id)} title="Restore Record" className="w-10 h-10 bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm">
                                   <RefreshCcw className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => handleDelete(r.id)} title="Archive Record" className="w-10 h-10 bg-rose-50 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Edit Slide-over or Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[4rem] shadow-2xl border-t sm:border border-white/20 p-8 sm:p-16 space-y-12 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 relative">
              
              <button onClick={() => setIsEditing(false)} className="absolute top-8 right-8 w-12 h-12 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>

              <div>
                 <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter font-outfit uppercase">{selectedRecord?.id ? "Edit Record" : "New Devotee"}</h3>
                 <p className="text-slate-400 font-bold mt-2">Adjust personnel data for the master Ashram directory.</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpsert(selectedRecord); }} className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                 
                 {/* Block 1: Identity */}
                 <div className="space-y-6">
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Initiated Name</span>
                       <input type="text" value={selectedRecord?.initiated_name || ""} onChange={(e) => setSelectedRecord({...selectedRecord, initiated_name: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. Rama Das" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Legal Name (Adhar)</span>
                       <input type="text" value={selectedRecord?.legal_name || ""} onChange={(e) => setSelectedRecord({...selectedRecord, legal_name: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. Rajesh Kumar" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Initiation Status</span>
                          <select value={selectedRecord?.initiation || ""} onChange={(e) => setSelectedRecord({...selectedRecord, initiation: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                             <option value="">Select...</option>
                             <option value="1st">1st</option>
                             <option value="2nd">2nd</option>
                             <option value="Not Initiated">Not Initiated</option>
                          </select>
                       </div>
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Colour Code</span>
                           <select value={selectedRecord?.colour || ""} onChange={(e) => setSelectedRecord({...selectedRecord, colour: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                              <option value="">Select...</option>
                              <option value="Yellow">Yellow</option>
                              <option value="White">White</option>
                              <option value="Saffron">Saffron</option>
                           </select>
                       </div>
                    </div>
                 </div>

                 {/* Block 2: Contacts */}
                 <div className="space-y-6">
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">WhatsApp Number</span>
                       <input type="text" value={selectedRecord?.whatsapp_no || ""} onChange={(e) => setSelectedRecord({...selectedRecord, whatsapp_no: e.target.value})} className="w-full px-8 py-5 bg-emerald-50/30 border border-emerald-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. 9876543210" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Contact Number</span>
                       <input type="text" value={selectedRecord?.contact_no || ""} onChange={(e) => setSelectedRecord({...selectedRecord, contact_no: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. +91..." />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Email Address</span>
                       <input type="email" value={selectedRecord?.email_id || ""} onChange={(e) => setSelectedRecord({...selectedRecord, email_id: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 underline decoration-indigo-200" placeholder="devotee@iskcon" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Center / Base</span>
                       <input type="text" value={selectedRecord?.center || ""} onChange={(e) => setSelectedRecord({...selectedRecord, center: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                 </div>

                 {/* Block 3: Spiritual & Service */}
                 <div className="space-y-6">
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Spiritual Master</span>
                       <input type="text" value={selectedRecord?.spiritual_master || ""} onChange={(e) => setSelectedRecord({...selectedRecord, spiritual_master: e.target.value})} className="w-full px-8 py-5 bg-indigo-50/30 border border-indigo-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-700" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Counsellor</span>
                          <input type="text" value={selectedRecord?.counsellor || ""} onChange={(e) => setSelectedRecord({...selectedRecord, counsellor: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                       </div>
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Year Joining</span>
                          <input type="number" value={selectedRecord?.year_joining || ""} onChange={(e) => setSelectedRecord({...selectedRecord, year_joining: parseInt(e.target.value)})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none tabular-nums" />
                       </div>
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Custom Counsellor/Notes</span>
                       <input type="text" value={selectedRecord?.custom_counsellor || ""} onChange={(e) => setSelectedRecord({...selectedRecord, custom_counsellor: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Primary Services</span>
                       <textarea value={selectedRecord?.primary_services || ""} onChange={(e) => setSelectedRecord({...selectedRecord, primary_services: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-600 min-h-[100px]" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Secondary Services</span>
                       <textarea value={selectedRecord?.secondary_services || ""} onChange={(e) => setSelectedRecord({...selectedRecord, secondary_services: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-500 min-h-[80px]" />
                    </div>
                 </div>

                 {/* Block 4: Medical & Personal */}
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">DOB (Adhar)</span>
                          <input type="text" value={selectedRecord?.dob_adhar || ""} onChange={(e) => setSelectedRecord({...selectedRecord, dob_adhar: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                       </div>
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">DOB (Actual)</span>
                          <input type="text" value={selectedRecord?.dob_actual || ""} onChange={(e) => setSelectedRecord({...selectedRecord, dob_actual: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Blood Group</span>
                          <input type="text" value={selectedRecord?.blood_group || ""} onChange={(e) => setSelectedRecord({...selectedRecord, blood_group: e.target.value})} className="w-full px-4 py-4 bg-rose-50 border border-rose-100 rounded-2xl font-bold outline-none text-rose-600" />
                       </div>
                       <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Prasadam</span>
                          <input type="text" value={selectedRecord?.prasadam || ""} onChange={(e) => setSelectedRecord({...selectedRecord, prasadam: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                       </div>
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Aadhar Number</span>
                       <input type="text" value={selectedRecord?.aadhar_number || ""} onChange={(e) => setSelectedRecord({...selectedRecord, aadhar_number: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                    <div className="relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Pan Card No</span>
                       <input type="text" value={selectedRecord?.pan_card || ""} onChange={(e) => setSelectedRecord({...selectedRecord, pan_card: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" />
                    </div>
                 </div>

                 {/* Block 5: Logistics & Family */}
                 <div className="md:col-span-2 space-y-8 mt-10">
                   <div className="h-px bg-slate-100 w-full"></div>
                   <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">Logistics & Support Networks</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Relative 1 Contact</span>
                          <textarea value={selectedRecord?.relative_contact_1 || ""} onChange={(e) => setSelectedRecord({...selectedRecord, relative_contact_1: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 min-h-[80px]" placeholder="Relation - Name - Contact" />
                       </div>
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Relative 2 Contact</span>
                          <textarea value={selectedRecord?.relative_contact_2 || ""} onChange={(e) => setSelectedRecord({...selectedRecord, relative_contact_2: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 min-h-[80px]" />
                       </div>
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Relative 3 Contact</span>
                          <textarea value={selectedRecord?.relative_contact_3 || ""} onChange={(e) => setSelectedRecord({...selectedRecord, relative_contact_3: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-600 min-h-[80px]" />
                       </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Permanent Address (Adhar)</span>
                          <textarea value={selectedRecord?.address_adhar || ""} onChange={(e) => setSelectedRecord({...selectedRecord, address_adhar: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-600" />
                       </div>
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Home Town Address</span>
                          <textarea value={selectedRecord?.parents_address || ""} onChange={(e) => setSelectedRecord({...selectedRecord, parents_address: e.target.value})} className="w-full px-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-bold text-slate-600" />
                       </div>
                   </div>
                 </div>

                 {/* Block 6: Media & Attachments */}
                 <div className="md:col-span-2 space-y-6 mt-10">
                   <div className="h-px bg-slate-100 w-full"></div>
                   <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-indigo-400">Digital Assets & Metadata URLS</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Photo URL (Drive/Web)</span>
                          <input type="text" value={selectedRecord?.photo_url || ""} onChange={(e) => setSelectedRecord({...selectedRecord, photo_url: e.target.value})} className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-bold text-indigo-600 truncate" />
                       </div>
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Adhar Copy URL</span>
                          <input type="text" value={selectedRecord?.adhar_card_copy_url || ""} onChange={(e) => setSelectedRecord({...selectedRecord, adhar_card_copy_url: e.target.value})} className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-bold text-indigo-600 truncate" />
                       </div>
                       <div className="relative group">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 block mb-2">Pan Card Copy URL</span>
                          <input type="text" value={selectedRecord?.pan_card_copy_url || ""} onChange={(e) => setSelectedRecord({...selectedRecord, pan_card_copy_url: e.target.value})} className="w-full px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-bold text-indigo-600 truncate" />
                       </div>
                   </div>
                 </div>

                 <div className="md:col-span-2 pt-8 flex gap-4">
                     <button type="submit" className="flex-1 py-5 bg-indigo-600 hover:bg-slate-900 text-white font-black rounded-3xl text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 active:scale-95">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Commit Changes</>}
                     </button>
                     <button type="button" onClick={() => setIsEditing(false)} className="px-12 py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-3xl text-[12px] uppercase tracking-widest transition-all">
                        Cancel
                     </button>
                  </div>
               </form>
            </div>
         </div>
       )}
      </div>

      {/* Floating Status Toast */}
      {statusMsg && (
        <div className={`fixed bottom-10 right-10 z-[9999] px-8 py-5 rounded-[2rem] shadow-2xl backdrop-blur-xl border-2 flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 font-bold ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
            : 'bg-rose-500/90 text-white border-rose-400/50'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          <span className="max-w-xs">{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-4 opacity-50 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modern Confirm Modal Overlay with Deep Background Isolation */}
      {confirmConfig && (
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-3xl animate-in fade-in duration-500"
          style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
        >
           {/* Inner Modal Card */}
          <div className="bg-white/95 w-full max-w-md rounded-[3.5rem] shadow-[0_0_100px_-10px_rgba(0,0,0,0.5)] border-[8px] border-white p-10 sm:p-14 space-y-10 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative z-[100001]">
             <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner">
                   <AlertCircle className="w-12 h-12 text-indigo-500" />
                </div>
                <div>
                   <h3 className="text-3xl sm:text-[40px] font-black text-slate-900 tracking-tighter uppercase font-outfit leading-none mb-3">{confirmConfig.title}</h3>
                   <p className="text-slate-500 font-bold leading-relaxed text-lg px-2">{confirmConfig.message}</p>
                </div>
             </div>
             
             <div className="flex flex-col gap-4">
                <button 
                  onClick={confirmConfig.onConfirm}
                  disabled={loading || syncing}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-[0.25em] transition-all shadow-[0_20px_50px_-12px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-50"
                >
                   {loading || syncing ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-white/50" /> : "Confirm Action"}
                </button>
                <button 
                  onClick={() => setConfirmConfig(null)}
                  className="w-full bg-slate-100/50 hover:bg-slate-100 text-slate-400 py-6 rounded-3xl font-black text-sm uppercase tracking-[0.25em] transition-all active:scale-95 border border-slate-200/50"
                >
                   Cancel
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
