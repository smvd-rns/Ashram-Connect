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
  UserCheck, User,
  RefreshCcw,
  Eye,
  EyeOff,
  ArrowRightLeft,
  Inbox,
  Check, Link,
  UserX,
  ArrowRight,
  Heart,
  Camera,
  FileText,
  CreditCard,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";

const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.75): Promise<File | Blob> => {
  return new Promise((resolve) => {
    // Bypass compression for non-images (e.g., PDFs) or GIFs
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Constrain dimensions to reasonable max
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized compressed JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const cleanName = file.name.replace(/\.[^/.]+$/, ".jpg");
              resolve(new File([blob], cleanName, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

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
  
  // -- EDITING MULTI-STEP STATES --
  const [editStep, setEditStep] = useState(1);
  const [editRelatives, setEditRelatives] = useState([
    { relation: "Father", name: "", number: "" },
    { relation: "Mother", name: "", number: "" },
    { relation: "Brother", name: "", number: "" }
  ]);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({
    photo: false,
    pan: false,
    adhar: false
  });
  
  // -- SUBMISSIONS SYSTEM STATES --
  const [viewSubmissions, setViewSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isReviewingSubmission, setIsReviewingSubmission] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [processingSubmission, setProcessingSubmission] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [lightbox, setLightbox] = useState<{ url: string, title: string } | null>(null);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const handleCopyRegistrationLink = () => {
    const link = `${window.location.origin}/register/bcdb`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
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

  useEffect(() => {
    // Always track count of pending submissions in background
    if (session) {
      fetch(`/api/admin/bcdb/submissions?status=pending`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      })
      .then(r => r.json())
      .then(res => {
        if (res.data) setPendingCount(res.data.length);
      }).catch(console.error);
    }
  }, [session, data]);

  // Synchronize edit details & relatives when selectedRecord changes
  useEffect(() => {
    if (isEditing && selectedRecord) {
      setEditStep(1);
      
      const parseRelative = (contactStr: string, defaultRelation: string) => {
        if (!contactStr) return { relation: defaultRelation, name: "", number: "" };
        const parts = contactStr.split("-");
        if (parts.length >= 3) {
          const relation = parts[0];
          const number = parts[parts.length - 1];
          const name = parts.slice(1, parts.length - 1).join("-");
          return { relation, name, number };
        } else if (parts.length === 2) {
          return { relation: defaultRelation, name: parts[0], number: parts[1] };
        }
        return { relation: defaultRelation, name: contactStr, number: "" };
      };

      setEditRelatives([
        parseRelative(selectedRecord.relative_contact_1 || "", "Father"),
        parseRelative(selectedRecord.relative_contact_2 || "", "Mother"),
        parseRelative(selectedRecord.relative_contact_3 || "", "Brother")
      ]);
    }
  }, [selectedRecord, isEditing]);

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "pan" | "adhar") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMap(prev => ({ ...prev, [type]: true }));
    setStatusMsg(null);

    try {
      const processedFile = await compressImage(file);

      const payload = new FormData();
      payload.append("file", processedFile);
      payload.append("type", type);

      const res = await fetch("/api/register/bcdb/upload", {
        method: "POST",
        body: payload
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to upload document.");
      }

      setSelectedRecord((prev: any) => {
        const updates = { ...prev };
        if (type === "photo") updates.photo_url = result.publicUrl;
        if (type === "adhar") updates.adhar_card_copy_url = result.publicUrl;
        if (type === "pan") updates.pan_card_copy_url = result.publicUrl;
        return updates;
      });
      setStatusMsg({ type: 'success', text: `${type.toUpperCase()} copy uploaded successfully.` });
    } catch (error: any) {
      console.error(error);
      setStatusMsg({ type: 'error', text: `Upload Error: ${error.message}` });
    } finally {
      setUploadingMap(prev => ({ ...prev, [type]: false }));
      e.target.value = "";
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Complete Compulsory Fields Validation
    const missing = [];
    if (!selectedRecord?.legal_name?.trim()) missing.push("Legal Name");
    if (selectedRecord?.initiation !== "Not Initiated" && !selectedRecord?.initiated_name?.trim()) missing.push("Initiated Name");
    if (!selectedRecord?.dob_adhar) missing.push("DOB (as per Aadhar)");
    if (!selectedRecord?.dob_actual) missing.push("DOB (Birthday)");
    if (!selectedRecord?.blood_group?.trim()) missing.push("Blood Group");
    
    if (!selectedRecord?.email_id?.trim()) missing.push("Email Address");
    if (!selectedRecord?.contact_no?.trim()) missing.push("Phone Contact");
    if (!selectedRecord?.center?.trim()) missing.push("Base Center");
    if (!selectedRecord?.spiritual_master?.trim()) missing.push("Spiritual Master");
    if (!selectedRecord?.counsellor?.trim()) missing.push("Counsellor");
    if (!selectedRecord?.year_joining) missing.push("Year of Joining");
    
    if (!selectedRecord?.primary_services?.trim()) missing.push("Primary Services");
    if (!selectedRecord?.secondary_services?.trim()) missing.push("Secondary Services");
    if (!selectedRecord?.address_adhar?.trim()) missing.push("Aadhar Address");
    if (!selectedRecord?.parents_address?.trim()) missing.push("Home/Parents Address");

    // Relatives emergency contacts
    if (!editRelatives[0].name.trim() || !editRelatives[0].number.trim()) missing.push("Relative 1 Details");
    if (!editRelatives[1].name.trim() || !editRelatives[1].number.trim()) missing.push("Relative 2 Details");
    if (!editRelatives[2].name.trim() || !editRelatives[2].number.trim()) missing.push("Relative 3 Details");

    if (!selectedRecord?.aadhar_number?.trim()) missing.push("Aadhar Number");
    if (!selectedRecord?.pan_card?.trim()) missing.push("PAN Card Number");

    // Media Files Validation
    if (!selectedRecord?.photo_url) missing.push("Profile Photo Upload");
    if (!selectedRecord?.adhar_card_copy_url) missing.push("Aadhar Card Copy Upload");
    if (!selectedRecord?.pan_card_copy_url) missing.push("PAN Card Copy Upload");

    if (missing.length > 0) {
      setStatusMsg({ type: 'error', text: `Required fields missing: ${missing.join(", ")}` });
      return;
    }

    const updatedRecord = {
      ...selectedRecord,
      relative_contact_1: editRelatives[0].name ? `${editRelatives[0].relation}-${editRelatives[0].name.trim()}-${editRelatives[0].number.trim()}` : "",
      relative_contact_2: editRelatives[1].name ? `${editRelatives[1].relation}-${editRelatives[1].name.trim()}-${editRelatives[1].number.trim()}` : "",
      relative_contact_3: editRelatives[2].name ? `${editRelatives[2].relation}-${editRelatives[2].name.trim()}-${editRelatives[2].number.trim()}` : ""
    };

    handleUpsert(updatedRecord);
  };



  useEffect(() => {
    if (viewSubmissions) {
      fetchSubmissions();
    } else {
      fetchData();
    }
  }, [viewSubmissions, searchQuery]);

  const fetchSubmissions = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bcdb/submissions?status=pending&query=${searchQuery}`, {
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.data) {
        setSubmissions(result.data);
        setPendingCount(result.data.length);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSubmission = async (id: string) => {
    setProcessingSubmission(true);
    try {
      const res = await fetch(`/api/admin/bcdb/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: "approve", submissionId: id })
      });
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Approval failed.");
      }

      setStatusMsg({ type: 'success', text: "Registration approved and devotee added to master directory!" });
      setIsReviewingSubmission(false);
      fetchSubmissions();
      fetchData(); // Refresh main dataset
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setProcessingSubmission(false);
    }
  };

  const handleRejectSubmission = async (id: string, reason: string) => {
    setProcessingSubmission(true);
    try {
      const res = await fetch(`/api/admin/bcdb/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: "reject", submissionId: id, reason })
      });
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Rejection failed.");
      }

      setStatusMsg({ type: 'success', text: "Registration submission rejected." });
      setIsReviewingSubmission(false);
      setRejectionReason("");
      fetchSubmissions();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setProcessingSubmission(false);
    }
  };

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

         <div className="flex flex-wrap gap-2.5 sm:gap-3 w-full lg:w-auto lg:justify-end">
            <label className="flex-1 lg:flex-none">
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} disabled={importing} />
              <div className="flex items-center justify-center gap-3 bg-white border-2 border-slate-100 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all cursor-pointer shadow-sm">
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span className="hidden sm:inline">Import Excel</span><span className="sm:hidden">Import</span>
              </div>
            </label>
            <button onClick={handleExport} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-slate-900 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
               <Download className="w-5 h-5 text-indigo-400" />
               <span className="hidden sm:inline">Export Master</span><span className="sm:hidden">Export</span>
            </button>
            <button 
              onClick={() => setViewSubmissions(!viewSubmissions)} 
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all relative shadow-sm ${
                viewSubmissions 
                  ? 'bg-orange-500 text-white shadow-orange-200 shadow-lg' 
                  : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-orange-500 hover:text-orange-600'
              }`}
            >
               <Inbox className="w-5 h-5" />
               <span className="hidden sm:inline">{viewSubmissions ? "Exit Submissions" : "Review Submissions"}</span>
               <span className="sm:hidden">{viewSubmissions ? "Exit" : "Submissions"}</span>
               {pendingCount > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md animate-bounce">
                   {pendingCount}
                 </span>
               )}
            </button>
             <button 
               onClick={handleCopyRegistrationLink} 
               className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all relative shadow-sm hover:scale-105 active:scale-95 ${
                 copiedLink 
                   ? 'bg-teal-500 text-white shadow-teal-200 animate-pulse border-2 border-teal-600' 
                   : 'bg-indigo-50 border-2 border-indigo-100 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-500 hover:text-white shadow-indigo-50 shadow-md'
               }`}
             >
                {copiedLink ? <Check className="w-5 h-5" /> : <Link className="w-5 h-5" />}
                <span className="hidden sm:inline">{copiedLink ? "Link Copied!" : "Copy Reg. Link"}</span>
                <span className="sm:hidden">{copiedLink ? "Copied!" : "Link"}</span>
             </button>
             <button onClick={() => { setSelectedRecord({}); setIsEditing(true); }} className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-200">
               <Plus className="w-5 h-5" />
               Add New
            </button>
            <button 
              onClick={syncToProfiles} 
              disabled={syncing}
              className="flex-1 lg:flex-none flex items-center justify-center gap-3 bg-emerald-600 text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
            >
               {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
               <span className="hidden sm:inline">Sync to Profiles</span><span className="sm:hidden">Sync PF</span>
            </button>
            <button 
              onClick={() => setShowDeleted(!showDeleted)} 
              className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
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
      {/* Submissions Queue or Main Table View */}
      {viewSubmissions ? (
         <div className="bg-gradient-to-br from-orange-50 via-white to-amber-50 rounded-[3rem] border-2 border-orange-100 shadow-2xl shadow-orange-950/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 sm:p-10 border-b border-orange-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/50 backdrop-blur-md">
               <div>
                  <h3 className="text-2xl font-black text-orange-900 tracking-tight uppercase flex items-center gap-3">
                     <Inbox className="w-7 h-7 text-orange-500" /> 
                     Review Registration Pool
                  </h3>
                  <p className="text-orange-600/80 text-sm font-bold mt-1">Audit public devotee submissions before writing to the authoritative BCDB ledger.</p>
               </div>
               <div className="bg-orange-100 text-orange-700 font-black px-5 py-2 rounded-2xl text-xs tracking-wider uppercase shadow-inner border border-orange-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 animate-pulse" /> {submissions.length} Pending
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-900 text-slate-300">
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest">Applicant Identity</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest">Direct Contact</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest">Verification File</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest">Recorded On</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-widest text-center">Review Controls</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-50 bg-white/40 backdrop-blur-sm">
                     {loading ? (
                        <tr>
                           <td colSpan={5} className="py-32 text-center">
                              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
                              <div className="text-orange-600/60 text-xs font-black uppercase tracking-widest mt-4">Buffering Submissions Queue...</div>
                           </td>
                        </tr>
                     ) : submissions.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="py-32 text-center">
                              <div className="w-20 h-20 bg-orange-50 text-orange-300 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-10 h-10" /></div>
                              <h4 className="text-slate-700 font-black text-base uppercase tracking-widest">Queue Cleared</h4>
                              <p className="text-slate-400 font-bold text-xs mt-1">All submitted registration forms have been reviewed and actioned.</p>
                           </td>
                        </tr>
                     ) : (
                        submissions.map((sub) => (
                           <tr key={sub.id} className="hover:bg-white transition-colors group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-200 rounded-[1.2rem] flex items-center justify-center font-black text-orange-700 relative overflow-hidden border border-orange-200 group-hover:scale-105 transition-transform shadow-inner">
                                       {sub.photo_url ? (
                                          <img src={sub.photo_url} alt="devotee" className="absolute inset-0 w-full h-full object-cover" onError={(e:any)=>e.target.style.display='none'} />
                                       ) : null}
                                       <span className="relative z-10 tracking-tighter uppercase">{(sub.initiated_name || sub.legal_name || "?")[0]}</span>
                                    </div>
                                    <div>
                                       <div className="font-black text-slate-800 text-[17px] tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{sub.initiated_name || "Uninitiated Devotee"}</div>
                                       <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mt-1 flex items-center gap-1.5">
                                          <User className="w-3 h-3" /> {sub.legal_name}
                                       </div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6 font-bold text-[13px]">
                                 <div className="text-slate-700 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-300" /> {sub.email_id}</div>
                                 <div className="text-emerald-600 font-black text-xs mt-1.5 flex items-center gap-1.5 tracking-wider"><Phone className="w-3.5 h-3.5 text-emerald-400" /> {sub.contact_no}</div>
                              </td>
                              <td className="px-8 py-6">
                                 <div className="flex flex-wrap gap-2">
                                    {sub.adhar_card_copy_url ? (
                                       <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-lg uppercase text-[9px] font-black tracking-widest">Aadhar Submitted</span>
                                    ) : (
                                       <span className="bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg uppercase text-[9px] font-black tracking-widest">No Aadhar</span>
                                    )}
                                    {sub.pan_card_copy_url ? (
                                       <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase text-[9px] font-black tracking-widest">PAN Submitted</span>
                                    ) : (
                                       <span className="bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg uppercase text-[9px] font-black tracking-widest">No PAN</span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-slate-500 text-xs font-bold">
                                 <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                    {new Date(sub.submitted_at).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })}
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <button 
                                    onClick={() => { setSelectedSubmission(sub); setIsReviewingSubmission(true); }}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-[0.18em] px-6 py-3 rounded-2xl transition-all shadow-lg shadow-orange-200 hover:scale-105 active:scale-95"
                                 >
                                    Inspect Profile
                                 </button>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      ) : (
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
                                                     className={`group transition-colors relative ${getRowColor(r.colour)} ${r.is_deleted ? 'opacity-50 grayscale-[0.5] bg-rose-50/20' : ''}`}
                        >

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
                            {r.adhar_card_copy_url ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setLightbox({ url: r.adhar_card_copy_url, title: `${r.initiated_name || r.legal_name} - Aadhar Copy` }); }}
                                className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                              >
                                 <Eye className="w-3 h-3" /> View Adhar
                              </button>
                            ) : "- "}
                         </td>
                         <td className="px-8 py-5">
                            {r.pan_card_copy_url ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setLightbox({ url: r.pan_card_copy_url, title: `${r.initiated_name || r.legal_name} - PAN Copy` }); }}
                                className="text-indigo-500 hover:text-indigo-700 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1 transition-all hover:scale-105 active:scale-95"
                              >
                                 <Eye className="w-3 h-3" /> View Pan
                              </button>
                            ) : "- "}
                         </td>
                        <td className="px-8 py-5">
                           <div className="text-slate-400 font-medium text-xs italic">{r.custom_counsellor || "- "}</div>
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

      )}

      {/* Edit Slide-over or Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[4rem] shadow-2xl border-t sm:border border-white/20 p-8 sm:p-16 space-y-12 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 relative">
              
              <button type="button" onClick={() => setIsEditing(false)} className="absolute top-8 right-8 w-12 h-12 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>

              <div>
                 <h3 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter font-outfit uppercase">{selectedRecord?.id ? "Edit Record" : "New Devotee"}</h3>
                 <p className="text-slate-400 font-bold mt-2">Adjust devotee details inside the master database directory.</p>
              </div>

              {/* Progress Indicator Strip */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
                {[1, 2, 3].map(idx => (
                  <React.Fragment key={idx}>
                    <button 
                      type="button"
                      onClick={() => setEditStep(idx)} 
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs tracking-tight border-2 transition-all ${
                        editStep === idx ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-110" :
                        editStep > idx ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        "bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-500"
                      }`}
                    >
                      {editStep > idx ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx}
                    </button>
                    {idx < 3 && <div className={`w-6 sm:w-10 h-0.5 rounded-full ${editStep > idx ? "bg-emerald-200" : "bg-slate-200"}`}></div>}
                  </React.Fragment>
                ))}
              </div>

              <form onSubmit={handleEditSubmit}>
                {/* ====================================
                    STEP 1: PRIMARY PROFILE IDENTITY
                   ==================================== */}
                {editStep === 1 && (
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Identity Details</h2>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-bold mt-0.5">Provide names exactly as recorded in official documents.</p>
                      </div>
                      <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest uppercase shrink-0">Step 1 of 3</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-orange-600/80 uppercase tracking-wider pl-1">Legal Name (as on Aadhar)*</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" required value={selectedRecord?.legal_name || ""} onChange={(e) => setSelectedRecord({...selectedRecord, legal_name: e.target.value})} placeholder="Enter government name" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-orange-50 focus:border-orange-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-amber-600 uppercase tracking-wider pl-1">Initiated Name (Mandatory if Initiated)*</label>
                        <div className="relative">
                          <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-300" />
                          <input type="text" value={selectedRecord?.initiated_name || ""} onChange={(e) => setSelectedRecord({...selectedRecord, initiated_name: e.target.value})} placeholder="e.g., Rama Das (or N/A)" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-amber-50/30 border border-amber-100 rounded-2xl font-bold text-amber-800 text-sm placeholder:text-amber-300 focus:bg-white focus:ring-8 focus:ring-amber-100/50 focus:border-amber-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Initiation Status*</label>
                        <select value={selectedRecord?.initiation || ""} onChange={(e) => setSelectedRecord({...selectedRecord, initiation: e.target.value})} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500">
                          <option value="Not Initiated">Not Initiated</option>
                          <option value="1st">1st Initiation</option>
                          <option value="2nd">2nd Initiation</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Colour Category*</label>
                        <select value={selectedRecord?.colour || ""} onChange={(e) => setSelectedRecord({...selectedRecord, colour: e.target.value})} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500">
                          <option value="White">White</option>
                          <option value="Yellow">Yellow</option>
                          <option value="Saffron">Saffron</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">DOB (As per Aadhar)*</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                          <input type="date" required value={selectedRecord?.dob_adhar || ""} onChange={(e) => setSelectedRecord({...selectedRecord, dob_adhar: e.target.value})} className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">DOB (Actual/Birthday)*</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                          <input type="date" required value={selectedRecord?.dob_actual || ""} onChange={(e) => setSelectedRecord({...selectedRecord, dob_actual: e.target.value})} className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Blood Group*</label>
                        <input type="text" required value={selectedRecord?.blood_group || ""} onChange={(e) => setSelectedRecord({...selectedRecord, blood_group: e.target.value})} placeholder="e.g. B+ , O-" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button type="button" onClick={() => setEditStep(2)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:scale-105 hover:shadow-orange-500/25 active:scale-95 transition-all shadow-lg shadow-orange-500/10">
                        Continue to Contact
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ====================================
                    STEP 2: CONTACT, SERVICES & RELATIVES
                   ==================================== */}
                {editStep === 2 && (
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Communication & Spiritual</h2>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-bold mt-0.5">Provide contact, service, and background details.</p>
                      </div>
                      <span className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest uppercase shrink-0">Step 2 of 3</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Email Address*</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="email" required value={selectedRecord?.email_id || ""} onChange={(e) => setSelectedRecord({...selectedRecord, email_id: e.target.value})} placeholder="name@email.com" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm lowercase focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Phone Contact*</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="tel" required value={selectedRecord?.contact_no || ""} onChange={(e) => setSelectedRecord({...selectedRecord, contact_no: e.target.value})} placeholder="Mobile phone number" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-emerald-600 uppercase tracking-wider pl-1">WhatsApp Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
                          <input type="tel" value={selectedRecord?.whatsapp_no || ""} onChange={(e) => setSelectedRecord({...selectedRecord, whatsapp_no: e.target.value})} placeholder="WhatsApp contact (Optional)" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-indigo-600 uppercase tracking-wider pl-1">Base Center*</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" required value={selectedRecord?.center || ""} onChange={(e) => setSelectedRecord({...selectedRecord, center: e.target.value})} placeholder="e.g., RAJGAD" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Spiritual Master*</label>
                        <input type="text" required value={selectedRecord?.spiritual_master || ""} onChange={(e) => setSelectedRecord({...selectedRecord, spiritual_master: e.target.value})} placeholder="Aspiring or Initiated master" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Counsellor*</label>
                        <input type="text" required value={selectedRecord?.counsellor || ""} onChange={(e) => setSelectedRecord({...selectedRecord, counsellor: e.target.value})} placeholder="Temple Counsellor" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Custom Counsellor / Notes</label>
                        <input type="text" value={selectedRecord?.custom_counsellor || ""} onChange={(e) => setSelectedRecord({...selectedRecord, custom_counsellor: e.target.value})} placeholder="Custom counsellor name or notes" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Year of Joining*</label>
                        <input type="number" required value={selectedRecord?.year_joining || ""} onChange={(e) => setSelectedRecord({...selectedRecord, year_joining: e.target.value ? parseInt(e.target.value) : ""})} placeholder="YYYY" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Prasadam Preference*</label>
                        <select value={selectedRecord?.prasadam || ""} onChange={(e) => setSelectedRecord({...selectedRecord, prasadam: e.target.value})} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-50">
                          <option value="2T">2T</option>
                          <option value="3T">3T</option>
                          <option value="Tatastha">Tatastha</option>
                        </select>
                      </div>

                      {/* Devotional Services Section */}
                      <div className="md:col-span-2 bg-violet-50/30 border-2 border-violet-100/60 p-5 sm:p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-200/20 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-violet-600 uppercase tracking-wider pl-1">Primary Devotional Services*</label>
                          <textarea required rows={3} value={selectedRecord?.primary_services || ""} onChange={(e) => setSelectedRecord({...selectedRecord, primary_services: e.target.value})} placeholder="Regular services performed..." className="w-full px-4 py-3.5 sm:py-4 bg-white border border-violet-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:ring-8 focus:ring-violet-100 focus:border-violet-400 transition-all resize-none shadow-sm" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-violet-600 uppercase tracking-wider pl-1">Secondary Devotional Services*</label>
                          <textarea required rows={3} value={selectedRecord?.secondary_services || ""} onChange={(e) => setSelectedRecord({...selectedRecord, secondary_services: e.target.value})} placeholder="Secondary or alternate services..." className="w-full px-4 py-3.5 sm:py-4 bg-white border border-violet-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:ring-8 focus:ring-violet-100 focus:border-violet-400 transition-all resize-none shadow-sm" />
                        </div>
                      </div>

                      {/* Address block */}
                      <div className="space-y-1 md:col-span-2 bg-cyan-50/30 border-2 border-cyan-100/60 p-5 sm:p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-200/20 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-cyan-700 uppercase tracking-wider pl-1">Aadhar Card Address*</label>
                          <textarea required rows={3} value={selectedRecord?.address_adhar || ""} onChange={(e) => setSelectedRecord({...selectedRecord, address_adhar: e.target.value})} placeholder="Enter permanent address as on Aadhar Card" className="w-full px-4 py-3.5 sm:py-4 bg-white border border-cyan-100 rounded-2xl font-bold text-slate-700 text-sm outline-none resize-none shadow-sm focus:ring-8 focus:ring-cyan-100 focus:border-cyan-400" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-black text-cyan-700 uppercase tracking-wider pl-1">Home / Parents Town Address*</label>
                          <textarea required rows={3} value={selectedRecord?.parents_address || ""} onChange={(e) => setSelectedRecord({...selectedRecord, parents_address: e.target.value})} placeholder="Enter alternate home or parents' address" className="w-full px-4 py-3.5 sm:py-4 bg-white border border-cyan-100 rounded-2xl font-bold text-slate-700 text-sm outline-none resize-none shadow-sm focus:ring-8 focus:ring-cyan-100 focus:border-cyan-400" />
                        </div>
                      </div>

                      {/* Relative Contacts Section */}
                      <div className="md:col-span-2 bg-indigo-50/30 p-4 sm:p-8 rounded-[2rem] border-2 border-indigo-100/70 space-y-6 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                        <div>
                           <span className="text-[11px] font-black text-indigo-700 uppercase tracking-[0.18em] block mb-1 pl-1">Relative / Family Contacts*</span>
                           <span className="text-[10px] font-bold text-indigo-400/80 block pl-1">Provide emergency contact information for all 3 relatives.</span>
                        </div>
                        <div className="space-y-6 divide-y divide-indigo-100/50">
                          {editRelatives.map((rel, idx) => (
                            <div key={idx} className={`grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 ${idx > 0 ? "pt-6" : ""}`}>
                              
                              {/* Relation Dropdown */}
                              <div className="sm:col-span-3 space-y-1">
                                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider pl-1">Relation {idx + 1}*</label>
                                <select 
                                  value={rel.relation} 
                                  onChange={(e) => {
                                    const updated = [...editRelatives];
                                    updated[idx].relation = e.target.value;
                                    setEditRelatives(updated);
                                  }}
                                  className="w-full px-4 py-3.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400"
                                >
                                  <option value="Father">Father</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Brother">Brother</option>
                                  <option value="Sister">Sister</option>
                                  <option value="Spouse">Spouse</option>
                                  <option value="Son">Son</option>
                                  <option value="Daughter">Daughter</option>
                                  <option value="Guardian">Guardian</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              {/* Full Name Input */}
                              <div className="sm:col-span-5 space-y-1">
                                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider pl-1">Full Name*</label>
                                <input 
                                  type="text" 
                                  required
                                  value={rel.name} 
                                  onChange={(e) => {
                                    const updated = [...editRelatives];
                                    updated[idx].name = e.target.value;
                                    setEditRelatives(updated);
                                  }}
                                  placeholder="Name" 
                                  className="w-full px-4 py-3.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400" 
                                />
                              </div>

                              {/* Phone / Number Input */}
                              <div className="sm:col-span-4 space-y-1">
                                <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider pl-1">Contact Number*</label>
                                <input 
                                  type="tel" 
                                  required
                                  value={rel.number} 
                                  onChange={(e) => {
                                    const updated = [...editRelatives];
                                    updated[idx].number = e.target.value;
                                    setEditRelatives(updated);
                                  }}
                                  placeholder="Phone number" 
                                  className="w-full px-4 py-3.5 bg-white border border-indigo-100 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm focus:ring-8 focus:ring-indigo-50 focus:border-indigo-400" 
                                />
                              </div>

                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between pt-4 gap-3">
                      <button type="button" onClick={() => setEditStep(1)} className="w-full sm:w-auto font-black text-xs uppercase tracking-widest text-slate-400 px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all">
                        Back
                      </button>
                      <button type="button" onClick={() => setEditStep(3)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-black text-xs uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:scale-105 hover:shadow-indigo-500/25 active:scale-95 transition-all shadow-lg shadow-indigo-500/10">
                        Continue to Proofs
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ====================================
                    STEP 3: VERIFICATION DOCUMENTS
                   ==================================== */}
                {editStep === 3 && (
                  <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                    <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">ID Proof & Documents</h2>
                        <p className="text-slate-400 text-[10px] sm:text-xs font-bold mt-0.5">Verify identity by uploading copies. Max 5MB per file.</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black tracking-widest uppercase shrink-0">Step 3 of 3</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Aadhar Number*</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" required value={selectedRecord?.aadhar_number || ""} onChange={(e) => setSelectedRecord({...selectedRecord, aadhar_number: e.target.value})} placeholder="12 Digit Aadhar No." className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">PAN Card Number*</label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input type="text" required value={selectedRecord?.pan_card || ""} onChange={(e) => setSelectedRecord({...selectedRecord, pan_card: e.target.value})} placeholder="Alpha-numeric PAN" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                        </div>
                      </div>
                    </div>

                    {/* Upload Widgets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2 sm:pt-4">
                      
                      {/* File 1: Profile Photo */}
                      <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-pink-50/20 border-2 border-dashed border-pink-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-pink-400 transition-all shadow-sm">
                        <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-pink-700">Personal Photo*</span>
                        <p className="text-[9px] text-pink-500/70 font-bold mt-1 leading-tight mb-4">Front portrait image.</p>
                        
                        {selectedRecord?.photo_url ? (
                          <div className="w-full flex flex-col gap-2">
                            <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                            </div>
                            <label className="cursor-pointer w-full bg-white border border-pink-200 hover:border-pink-500 py-1.5 rounded-xl flex items-center justify-center font-black text-[9px] uppercase tracking-wider text-pink-600 hover:bg-pink-50">
                              {uploadingMap.photo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Change File"}
                              <input type="file" accept="image/*" onChange={(e) => handleEditFileUpload(e, "photo")} className="hidden" disabled={uploadingMap.photo} />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer w-full bg-white border border-pink-200 hover:border-pink-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm active:scale-95 transition-all">
                            {uploadingMap.photo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                            <input type="file" accept="image/*" onChange={(e) => handleEditFileUpload(e, "photo")} className="hidden" disabled={uploadingMap.photo} />
                          </label>
                        )}
                      </div>

                      {/* File 2: Aadhar Card Copy */}
                      <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-sky-50/20 border-2 border-dashed border-sky-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-sky-400 transition-all shadow-sm">
                        <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-sky-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-700">Aadhar Copy*</span>
                        <p className="text-[9px] text-sky-500/70 font-bold mt-1 leading-tight mb-4">PDF or Image format.</p>
                        
                        {selectedRecord?.adhar_card_copy_url ? (
                          <div className="w-full flex flex-col gap-2">
                            <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                            </div>
                            <label className="cursor-pointer w-full bg-white border border-sky-200 hover:border-sky-500 py-1.5 rounded-xl flex items-center justify-center font-black text-[9px] uppercase tracking-wider text-sky-600 hover:bg-sky-50">
                              {uploadingMap.adhar ? <Loader2 className="w-3 h-3 animate-spin" /> : "Change File"}
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleEditFileUpload(e, "adhar")} className="hidden" disabled={uploadingMap.adhar} />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer w-full bg-white border border-sky-200 hover:border-sky-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm active:scale-95 transition-all">
                            {uploadingMap.adhar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleEditFileUpload(e, "adhar")} className="hidden" disabled={uploadingMap.adhar} />
                          </label>
                        )}
                      </div>

                      {/* File 3: PAN Card Copy */}
                      <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-amber-50/20 border-2 border-dashed border-amber-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-amber-400 transition-all shadow-sm">
                        <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-700">PAN Card Copy*</span>
                        <p className="text-[9px] text-amber-500/70 font-bold mt-1 leading-tight mb-4">Front side scan copy.</p>
                        
                        {selectedRecord?.pan_card_copy_url ? (
                          <div className="w-full flex flex-col gap-2">
                            <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                            </div>
                            <label className="cursor-pointer w-full bg-white border border-amber-200 hover:border-amber-500 py-1.5 rounded-xl flex items-center justify-center font-black text-[9px] uppercase tracking-wider text-amber-600 hover:bg-amber-50">
                              {uploadingMap.pan ? <Loader2 className="w-3 h-3 animate-spin" /> : "Change File"}
                              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleEditFileUpload(e, "pan")} className="hidden" disabled={uploadingMap.pan} />
                            </label>
                          </div>
                        ) : (
                          <label className="cursor-pointer w-full bg-white border border-amber-200 hover:border-amber-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm active:scale-95 transition-all">
                            {uploadingMap.pan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleEditFileUpload(e, "pan")} className="hidden" disabled={uploadingMap.pan} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-100 text-[10px] sm:text-[11px] text-emerald-700 leading-relaxed font-bold flex items-start gap-3">
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                      <span>By committing these updates, you authorize securing these devotee files in the Master Database ledger.</span>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row justify-between pt-4 items-center gap-3">
                      <button type="button" onClick={() => setEditStep(2)} className="w-full sm:w-auto font-black text-xs uppercase tracking-widest text-slate-400 px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all">
                        Back
                      </button>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button type="button" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none font-black text-xs uppercase tracking-widest text-slate-400 px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all">
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={loading || Object.values(uploadingMap).includes(true)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-indigo-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-[0.18em] px-8 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-[1.8rem] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] sm:hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Recording...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              {selectedRecord?.id ? "Commit Changes" : "Submit Registration"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
           </div>
        </div>
      )}
      </div>

      {/* Registration Review Modal */}
      {isReviewingSubmission && selectedSubmission && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[4rem] shadow-2xl border-t sm:border border-white/20 p-8 sm:p-12 space-y-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 relative">
              
              <button onClick={() => setIsReviewingSubmission(false)} className="absolute top-8 right-8 w-12 h-12 bg-slate-100 text-slate-400 hover:bg-rose-500 hover:text-white rounded-2xl flex items-center justify-center transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>

              <div>
                 <span className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-1 rounded-xl text-[10px] font-black tracking-widest uppercase">Profile Audit</span>
                 <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter font-outfit uppercase mt-2">{selectedSubmission.initiated_name || "Uninitiated Devotee"}</h3>
                 <p className="text-slate-400 font-bold mt-1">Legal: {selectedSubmission.legal_name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 
                 {/* Contact & Personal Metadata */}
                 <div className="space-y-6 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-3">Personal File</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-700">
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Initiation</div>{selectedSubmission.initiation || "N/A"}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Color Cat.</div>{selectedSubmission.colour || "N/A"}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Phone</div>{selectedSubmission.contact_no}</div>
                       <div><div className="text-[10px] text-emerald-600 font-black uppercase">WhatsApp</div>{selectedSubmission.whatsapp_no || "N/A"}</div>
                       <div className="col-span-2"><div className="text-[10px] text-slate-400 font-black uppercase">Email Address</div>{selectedSubmission.email_id}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Base Center</div>{selectedSubmission.center || "N/A"}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Counsellor</div>{selectedSubmission.counsellor || selectedSubmission.custom_counsellor || "N/A"}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">Aadhar No</div>{selectedSubmission.aadhar_number || "N/A"}</div>
                       <div><div className="text-[10px] text-slate-400 font-black uppercase">PAN No</div>{selectedSubmission.pan_card || "N/A"}</div>
                    </div>
                    
                    
                    <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <div className="text-[10px] text-slate-400 font-black uppercase block mb-1">Primary Service</div>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{selectedSubmission.primary_services || "None declared."}</p>
                       </div>
                       <div>
                          <div className="text-[10px] text-slate-400 font-black uppercase block mb-1">Secondary Service</div>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{selectedSubmission.secondary_services || "None declared."}</p>
                       </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <div className="text-[10px] text-indigo-500 font-black uppercase block mb-1">Aadhar Address</div>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{selectedSubmission.address_adhar || "N/A"}</p>
                       </div>
                       <div>
                          <div className="text-[10px] text-indigo-500 font-black uppercase block mb-1">Parents Town Address</div>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed">{selectedSubmission.parents_address || "N/A"}</p>
                       </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
                       <div className="text-[10px] text-indigo-700 font-black uppercase block mb-3 pl-1">Relative Contacts</div>
                       <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-600">
                          <div className="flex justify-between border-b border-white/50 pb-1"><span>Relative 1:</span> <span className="text-slate-800">{selectedSubmission.relative_contact_1 || "—"}</span></div>
                          <div className="flex justify-between border-b border-white/50 pb-1"><span>Relative 2:</span> <span className="text-slate-800">{selectedSubmission.relative_contact_2 || "—"}</span></div>
                          <div className="flex justify-between"><span>Relative 3:</span> <span className="text-slate-800">{selectedSubmission.relative_contact_3 || "—"}</span></div>
                       </div>
                    </div>
                 </div>

                 {/* Identity Uploads Visual Preview */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Document Proofs</h4>
                    <div className="grid grid-cols-2 gap-4">
                       {/* Photo */}
                       <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 text-center">
                          <div className="text-[10px] text-slate-400 font-black uppercase mb-2">Profile Photo</div>
                          {selectedSubmission.photo_url ? (
                             <a href={selectedSubmission.photo_url} target="_blank" rel="noreferrer" className="block h-32 bg-white border rounded-xl overflow-hidden shadow-inner hover:opacity-90 transition-opacity">
                                <img src={selectedSubmission.photo_url} alt="profile" className="w-full h-full object-cover" />
                             </a>
                          ) : (
                             <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-300">No Upload</div>
                          )}
                       </div>
                       {/* Aadhar */}
                       <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 text-center">
                          <div className="text-[10px] text-slate-400 font-black uppercase mb-2">Aadhar Proof</div>
                          {selectedSubmission.adhar_card_copy_url ? (
                             selectedSubmission.adhar_card_copy_url.toLowerCase().split(/[#?]/)[0].endsWith(".pdf") ? (
                                 <div className="h-32 bg-white border rounded-xl overflow-hidden shadow-inner flex flex-col items-center justify-center">
                                    <iframe src={selectedSubmission.adhar_card_copy_url} className="w-full h-full border-0" title="Aadhar Copy" />
                                 </div>
                              ) : (
                                 <div className="block h-32 bg-slate-100 border rounded-xl overflow-hidden shadow-inner">
                                    <img src={selectedSubmission.adhar_card_copy_url} alt="Aadhar Card" className="w-full h-full object-contain bg-slate-200/50" />
                                 </div>
                              )
                          ) : (
                             <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-300">No Upload</div>
                          )}
                       </div>
                       {/* PAN */}
                       <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50 text-center col-span-2">
                          <div className="text-[10px] text-slate-400 font-black uppercase mb-2">PAN Proof</div>
                          {selectedSubmission.pan_card_copy_url ? (
                             selectedSubmission.pan_card_copy_url.toLowerCase().split(/[#?]/)[0].endsWith(".pdf") ? (
                                 <div className="h-48 bg-white border rounded-xl overflow-hidden shadow-inner">
                                    <iframe src={selectedSubmission.pan_card_copy_url} className="w-full h-full border-0" title="PAN Copy" />
                                 </div>
                              ) : (
                                 <div className="block h-48 bg-slate-100 border rounded-xl overflow-hidden shadow-inner">
                                    <img src={selectedSubmission.pan_card_copy_url} alt="PAN Card" className="w-full h-full object-contain bg-slate-200/50" />
                                 </div>
                              )
                          ) : (
                             <div className="py-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-300">No PAN Copy Supplied</div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              {/* Rejection Audit Container */}
              <div className="border-t border-slate-100 pt-8">
                 <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
                    <div className="flex-1 w-full relative group">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Rejection Feed (Optional)</span>
                       <input 
                          type="text" 
                          value={rejectionReason} 
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Provide brief reason if rejecting submission..." 
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-8 focus:ring-rose-50 focus:border-rose-400 outline-none transition-all font-bold text-slate-700 text-sm" 
                       />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                       <button 
                          onClick={() => handleRejectSubmission(selectedSubmission.id, rejectionReason)}
                          disabled={processingSubmission}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 font-black text-[11px] uppercase tracking-[0.18em] rounded-2xl transition-all shadow-sm"
                       >
                          <UserX className="w-4 h-4" /> Reject
                       </button>
                       <button 
                          onClick={() => handleApproveSubmission(selectedSubmission.id)}
                          disabled={processingSubmission}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-105 text-white font-black text-[11px] uppercase tracking-[0.18em] rounded-[1.5rem] shadow-xl shadow-emerald-200 transition-all"
                       >
                          {processingSubmission ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Approve & Transfer</>}
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Floating Status Toast */}
      {statusMsg && (
        <div className={`fixed bottom-10 right-10 z-[9999] px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl shadow-2xl backdrop-blur-xl border-2 flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 font-bold ${
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
      {/* Native Local Inline Proof Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => setLightbox(null)}>
          <div 
            className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col animate-in zoom-in-95 duration-250" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <div>
                 <h3 className="font-black text-slate-800 uppercase text-[11px] sm:text-xs tracking-widest">{lightbox.title}</h3>
              </div>
              <button 
                onClick={() => setLightbox(null)} 
                className="w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 hover:text-rose-500 text-slate-400 flex items-center justify-center transition-colors active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-50/50 p-5 sm:p-8 flex items-center justify-center overflow-y-auto min-h-0 w-full">
              {(() => {
                 const url = lightbox.url || "";
                 const match = url.match(/(?:id=|\/d\/|uc\?id=)([\w-]+)/);
                 const isGoogle = match && match[1] && (url.includes("drive.google.com") || url.includes("docs.google.com"));

                 if (isGoogle) {
                    return (
                       <iframe 
                          src={`https://drive.google.com/file/d/${match[1]}/preview`} 
                          className="w-full h-full min-h-[60vh] rounded-2xl border border-slate-200 bg-white shadow-inner" 
                          title="Google Drive View" 
                          allow="autoplay"
                       />
                    );
                 }

                 if (url.toLowerCase().split(/[#?]/)[0].endsWith(".pdf")) {
                    return (
                       <iframe src={url} className="w-full h-full min-h-[60vh] rounded-2xl border border-slate-200 bg-white shadow-inner" title="Document Proof PDF" />
                    );
                 }

                 return (
                    <div className="relative w-full h-full flex justify-center items-center bg-slate-100 rounded-2xl overflow-hidden p-4 border border-slate-200 shadow-inner min-h-[40vh]">
                       <img src={url} alt="Proof View" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
                    </div>
                 );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
