"use client";

import React, { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle, Trash2, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface HarinamBulkImportProps {
  session: any;
  onSuccess?: () => void;
}

export default function HarinamBulkImport({ session, onSuccess }: HarinamBulkImportProps) {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        const records: any[] = [];
        // Skip header row if it exists
        const startRow = (data[0]?.[0] || "").toString().toLowerCase().includes("name") ? 1 : 0;

        for (let i = startRow; i < data.length; i++) {
          const row = data[i];
          if (row.length < 3) continue;

          const name = (row[0] || "").toString().trim();
          let typeStr = (row[1] || "").toString().trim();
          const dateVal = row[2];

          // Handle Excel decimal time (e.g. 0.291666 -> 7:00 AM)
          if (row[1] != null && typeof row[1] === "number" && row[1] < 1) {
            const totalSeconds = Math.round(row[1] * 24 * 3600);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const ampm = hours >= 12 ? "PM" : "AM";
            const h12 = hours % 12 || 12;
            typeStr = `${h12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          }

          if (!name || !typeStr || !dateVal) continue;

          // Parse types: "(7:00:00 AM, PDC, 7:40:00 AM)"
          const types = (typeStr || "").toString().replace(/[()]/g, "").split(",").map(t => t.trim()).filter(Boolean);
          
          // Handle Excel date objects or strings
          let formattedDate = "";
          if (row[2] != null && typeof dateVal === "number") {
            // Excel serial date
            const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            formattedDate = date.toISOString().split("T")[0];
          } else if (dateVal) {
            const dateStr = dateVal.toString();
            if (dateStr.includes("/")) {
              const parts = dateStr.split("/");
              if (parts.length === 3) {
                const [m, d, y] = parts;
                formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              }
            } else {
              formattedDate = dateStr;
            }
          }

          if (name && types.length > 0 && formattedDate) {
            records.push({ full_name: name, types, date: formattedDate });
          }
        }

        setParsed(records);
        if (records.length === 0) {
          setMessage({ type: "error", text: "No valid records found in file. Ensure columns are: Name, Types, Date" });
        } else {
          setMessage({ type: "success", text: `Parsed ${records.length} records from file.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: "Failed to read file: " + err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleParseText = () => {
    setMessage(null);
    const lines = input.split("\n").filter(l => l.trim().length > 0);
    const records: any[] = [];

    for (const line of lines) {
      let parts = line.split("\t");
      if (parts.length < 3) parts = line.split(",");
      if (parts.length < 3) parts = line.split(/  +/);

      if (parts.length >= 3) {
        const name = parts[0].trim();
        const typeStr = parts[1].trim();
        const dateStr = parts[2].trim();

        const types = typeStr.replace(/[()]/g, "").split(",").map(t => t.trim());
        
        let formattedDate = dateStr;
        if (dateStr.includes("/")) {
          const [m, d, y] = dateStr.split("/");
          formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        records.push({ full_name: name, types, date: formattedDate });
      }
    }

    setParsed(records);
    if (records.length === 0) {
      setMessage({ type: "error", text: "No valid records found. Check format: Name [tab] Types [tab] Date" });
    }
  };

  const handleImport = async () => {
    if (parsed.length === 0 || !session?.access_token) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/harinam/bulk-import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ records: parsed }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setMessage({ type: "success", text: `Successfully imported ${data.count} records!` });
      setParsed([]);
      setInput("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSample = () => {
    const data = [
      ["Devotee Full Name", "Harinam Type", "Date"],
      ["Radhapada Pankaj das", "7:00:00 AM, PDC, 7:40:00 AM", "10/13/2025"],
      ["Sample User", "7:00:00 AM, PDC", "10/14/2025"],
      ["Another User", "7:40:00 AM", "10/14/2025"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "harinam_import_template.xlsx");
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Upload className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              Harinam Bulk Import
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              XLSX / CSV / Paste Tool
            </p>
          </div>
        </div>
        <button 
          onClick={downloadSample}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download Sample
        </button>
      </div>

      <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
          Format Guide
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Column 1: Name</p>
            <p className="text-[10px] font-bold text-slate-600">Must match BCDB Full Name exactly</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Column 2: Type</p>
            <p className="text-[10px] font-bold text-slate-600">Include: "7:00", "7:40", or "PDC"</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Column 3: Date</p>
            <p className="text-[10px] font-bold text-slate-600">Format: M/D/YYYY (e.g. 10/13/2025)</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* File Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group/upload border-4 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover/upload:scale-110 transition-transform">
            <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Drop Excel File Here</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">or click to browse from computer</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-100"></span>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-4 font-black text-slate-300 tracking-widest">OR PASTE TEXT</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Radhapada Pankaj das	(7:00:00 AM, PDC, 7:40:00 AM)	10/13/2025"
            className="w-full h-24 text-xs font-mono p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none"
          />
        </div>

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="text-xs font-black uppercase tracking-tight">{message.text}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleParseText}
            disabled={!input.trim()}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            Parse Data
          </button>
          <button
            onClick={() => { setInput(""); setParsed([]); setMessage(null); }}
            className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-rose-500 hover:border-rose-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {parsed.length > 0 && (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2 space-y-1">
              <div className="p-2 mb-2 bg-indigo-100/50 rounded-xl border border-indigo-200">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest text-center">
                  Showing first 100 of {parsed.length} records
                </p>
              </div>
              {parsed.slice(0, 100).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-800 truncate">{p.full_name}</p>
                    <p className="text-[9px] font-bold text-slate-400">{p.date}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.types.map((t: string) => (
                      <span key={t} className="px-1 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded uppercase">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleImport}
              disabled={submitting}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import {parsed.length} Records
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
