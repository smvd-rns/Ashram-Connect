"use client";

import React, { useState, useRef } from "react";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  Camera, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ArrowRight,
  Heart,
  Calendar,
  ChevronRight,
  Info
} from "lucide-react";

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

export default function BCDBRegistration() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({
    photo: false,
    pan: false,
    adhar: false
  });

  // Form state
  const [formData, setFormData] = useState({
    initiated_name: "",
    legal_name: "",
    initiation: "Not Initiated",
    colour: "White",
    spiritual_master: "",
    dob_adhar: "",
    dob_actual: "",
    contact_no: "",
    whatsapp_no: "",
    email_id: "",
    counsellor: "",
    custom_counsellor: "",
    center: "",
    year_joining: "",
    prasadam: "2T",
    primary_services: "",
    secondary_services: "",
    blood_group: "",
    aadhar_number: "",
    pan_card: "",
    address_adhar: "",
    parents_address: "",
    relative_contact_1: "",
    relative_contact_2: "",
    relative_contact_3: "",
    
    // Document URLs from Storage
    photo_url: "",
    adhar_card_copy_url: "",
    pan_card_copy_url: ""
  });

  // Granular Relative Tracker State
  const [relatives, setRelatives] = useState([
    { relation: "Father", name: "", number: "" },
    { relation: "Mother", name: "", number: "" },
    { relation: "Brother", name: "", number: "" }
  ]);

  const handleRelativeChange = (index: number, field: string, value: string) => {
    setRelatives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "pan" | "adhar") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMap(prev => ({ ...prev, [type]: true }));
    setErrorMsg(null);

    try {
      // Intelligently compress the image on the client side to optimize payload and storage footprints
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

      // Map response back to state
      setFormData(prev => {
        const updates: any = { ...prev };
        if (type === "photo") updates.photo_url = result.publicUrl;
        if (type === "adhar") updates.adhar_card_copy_url = result.publicUrl;
        if (type === "pan") updates.pan_card_copy_url = result.publicUrl;
        return updates;
      });
    } catch (error: any) {
      console.error(error);
      setErrorMsg(`Upload Error: ${error.message}`);
    } finally {
      setUploadingMap(prev => ({ ...prev, [type]: false }));
      // Clear input to allow re-select if failed
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Complete Compulsory Fields Validation
    const missing = [];
    if (!formData.legal_name.trim()) missing.push("Legal Name");
    if (formData.initiation !== "Not Initiated" && !formData.initiated_name.trim()) missing.push("Initiated Name");
    if (!formData.dob_adhar) missing.push("DOB (as per Aadhar)");
    if (!formData.dob_actual) missing.push("DOB (Birthday)");
    if (!formData.blood_group.trim()) missing.push("Blood Group");
    
    if (!formData.email_id.trim()) missing.push("Email Address");
    if (!formData.contact_no.trim()) missing.push("Phone Contact");
    if (!formData.center.trim()) missing.push("Base Center");
    if (!formData.spiritual_master.trim()) missing.push("Spiritual Master");
    if (!formData.counsellor.trim()) missing.push("Counsellor");
    if (!formData.year_joining) missing.push("Year of Joining");
    
    if (!formData.primary_services.trim()) missing.push("Primary Services");
    if (!formData.secondary_services.trim()) missing.push("Secondary Services");
    if (!formData.address_adhar.trim()) missing.push("Aadhar Address");
    if (!formData.parents_address.trim()) missing.push("Home/Parents Address");

    // Relatives
    if (!relatives[0].name.trim() || !relatives[0].number.trim()) missing.push("Relative 1 Details");
    if (!relatives[1].name.trim() || !relatives[1].number.trim()) missing.push("Relative 2 Details");
    if (!relatives[2].name.trim() || !relatives[2].number.trim()) missing.push("Relative 3 Details");

    if (!formData.aadhar_number.trim()) missing.push("Aadhar Number");
    if (!formData.pan_card.trim()) missing.push("PAN Card Number");

    // Media Files Validation
    if (!formData.photo_url) missing.push("Profile Photo Upload");
    if (!formData.adhar_card_copy_url) missing.push("Aadhar Card Copy Upload");
    if (!formData.pan_card_copy_url) missing.push("PAN Card Copy Upload");

    if (missing.length > 0) {
      setErrorMsg(`Mandatory fields are missing: ${missing.join(", ")}.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      ...formData,
      relative_contact_1: relatives[0].name ? `${relatives[0].relation}-${relatives[0].name.trim()}-${relatives[0].number.trim()}` : "",
      relative_contact_2: relatives[1].name ? `${relatives[1].relation}-${relatives[1].name.trim()}-${relatives[1].number.trim()}` : "",
      relative_contact_3: relatives[2].name ? `${relatives[2].relation}-${relatives[2].name.trim()}-${relatives[2].number.trim()}` : ""
    };

    try {
      const response = await fetch("/api/register/bcdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Submission encountered an error.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to send submission. Verify network connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-indigo-50/30 to-purple-50 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white font-outfit">
        <div className="bg-white w-full max-w-md text-center p-8 md:p-12 rounded-[2.5rem] shadow-2xl border-2 border-white/50 animate-in zoom-in-95 duration-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">Registration Received</h2>
          <p className="text-slate-500 font-bold leading-relaxed mb-8">
            Hare Krishna! Your submission has been successfully forwarded to the temple administration queue. Once a manager reviews and approves it, your record will go live in the Ashram Connect Master Database.
          </p>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-400 font-medium">
             You may close this window. No further actions are needed.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-indigo-50/30 to-purple-50 py-6 sm:py-12 px-3 sm:px-6 lg:px-8 font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Decorative glowing circles */}
      <div className="fixed top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-orange-200/40 rounded-full -mr-24 sm:-mr-48 -mt-24 sm:-mt-48 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-80 sm:w-[30rem] h-80 sm:h-[30rem] bg-indigo-200/30 rounded-full -ml-40 sm:-ml-60 -mb-40 sm:-mb-60 blur-3xl pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Dynamic Header */}
        <div className="text-center mb-8 sm:mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl sm:rounded-3xl shadow-xl mb-4 sm:mb-6 text-white transform hover:rotate-12 transition-transform">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-outfit uppercase">Ashram Connect</h1>
          <p className="mt-2 text-sm sm:text-lg text-slate-500 font-bold tracking-wide max-w-md sm:max-w-xl mx-auto px-2">
            Master database devotee registration portal. Help us maintain accurate personnel files.
          </p>
        </div>

        {/* Progress Indicator Strip */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          {[1, 2, 3].map(idx => (
            <React.Fragment key={idx}>
              <button 
                onClick={() => setStep(idx)} 
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black text-[11px] sm:text-xs tracking-tight border-2 transition-all ${
                  step === idx ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 scale-110" :
                  step > idx ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  "bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-500"
                }`}
              >
                {step > idx ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : idx}
              </button>
              {idx < 3 && <div className={`w-6 sm:w-10 h-0.5 rounded-full ${step > idx ? "bg-emerald-200" : "bg-slate-200"}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Main Glass Form Container */}
        <form 
          onSubmit={handleSubmit} 
          className={`bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 transition-all duration-500 ${
            step === 1 ? "border-orange-100 shadow-orange-500/[0.03] ring-4 ring-orange-500/[0.01]" :
            step === 2 ? "border-indigo-100 shadow-indigo-500/[0.03] ring-4 ring-indigo-500/[0.01]" :
            "border-emerald-100 shadow-emerald-500/[0.03] ring-4 ring-emerald-500/[0.01]"
          }`}
        >
          
          {errorMsg && (
            <div className="bg-rose-50 border-b-2 border-rose-100 p-5 sm:p-6 text-rose-600 font-bold text-xs sm:text-sm flex items-center gap-2.5 sm:gap-3 animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-5 sm:p-10 lg:p-12">
            
            {/* ====================================
                STEP 1: PRIMARY PROFILE IDENTITY
               ==================================== */}
            {step === 1 && (
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
                      <input type="text" name="legal_name" required value={formData.legal_name} onChange={handleChange} placeholder="Enter government name" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-orange-50 focus:border-orange-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-amber-600 uppercase tracking-wider pl-1">Initiated Name (Mandatory if Initiated)*</label>
                    <div className="relative">
                      <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-300" />
                      <input type="text" name="initiated_name" value={formData.initiated_name} onChange={handleChange} placeholder="e.g., Rama Das (or N/A)" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-amber-50/30 border border-amber-100 rounded-2xl font-bold text-amber-800 text-sm placeholder:text-amber-300 focus:bg-white focus:ring-8 focus:ring-amber-100/50 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Initiation Status*</label>
                    <select name="initiation" value={formData.initiation} onChange={handleChange} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500">
                      <option value="Not Initiated">Not Initiated</option>
                      <option value="1st">1st Initiation</option>
                      <option value="2nd">2nd Initiation</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Colour Category*</label>
                    <select name="colour" value={formData.colour} onChange={handleChange} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500">
                      <option value="White">White</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Saffron">Saffron</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">DOB (As per Aadhar)*</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                      <input type="date" name="dob_adhar" required value={formData.dob_adhar} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">DOB (Actual/Birthday)*</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                      <input type="date" name="dob_actual" required value={formData.dob_actual} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Blood Group*</label>
                    <input type="text" name="blood_group" required value={formData.blood_group} onChange={handleChange} placeholder="e.g. B+ , O-" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-orange-500" />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="button" onClick={() => setStep(2)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:scale-105 hover:shadow-orange-500/25 active:scale-95 transition-all shadow-lg shadow-orange-500/10">
                    Continue to Contact
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ====================================
                STEP 2: CONTACT, SERVICES & RELATIVES
               ==================================== */}
            {step === 2 && (
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
                      <input type="email" name="email_id" required value={formData.email_id} onChange={handleChange} placeholder="name@email.com" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm lowercase focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Phone Contact*</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input type="tel" name="contact_no" required value={formData.contact_no} onChange={handleChange} placeholder="Mobile phone number" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-emerald-600 uppercase tracking-wider pl-1">WhatsApp Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
                      <input type="tel" name="whatsapp_no" value={formData.whatsapp_no} onChange={handleChange} placeholder="WhatsApp contact (Optional)" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-indigo-600 uppercase tracking-wider pl-1">Base Center*</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input type="text" name="center" required value={formData.center} onChange={handleChange} placeholder="e.g., RAJGAD" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:ring-8 focus:ring-indigo-50 focus:border-indigo-500 transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Spiritual Master*</label>
                    <input type="text" name="spiritual_master" required value={formData.spiritual_master} onChange={handleChange} placeholder="Aspiring or Initiated master" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Counsellor*</label>
                    <input type="text" name="counsellor" required value={formData.counsellor} onChange={handleChange} placeholder="Temple Counsellor" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Year of Joining*</label>
                    <input type="number" name="year_joining" required value={formData.year_joining} onChange={handleChange} placeholder="YYYY" className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">Prasadam Preference*</label>
                    <select name="prasadam" value={formData.prasadam} onChange={handleChange} className="w-full px-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:bg-white focus:border-indigo-500">
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
                      <textarea name="primary_services" required rows={3} value={formData.primary_services} onChange={handleChange} placeholder="Regular services performed..." className="w-full px-4 py-3.5 sm:py-4 bg-white border border-violet-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:ring-8 focus:ring-violet-100 focus:border-violet-400 transition-all resize-none shadow-sm" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-violet-600 uppercase tracking-wider pl-1">Secondary Devotional Services*</label>
                      <textarea name="secondary_services" required rows={3} value={formData.secondary_services} onChange={handleChange} placeholder="Secondary or alternate services..." className="w-full px-4 py-3.5 sm:py-4 bg-white border border-violet-100 rounded-2xl font-bold text-slate-700 text-sm outline-none focus:ring-8 focus:ring-violet-100 focus:border-violet-400 transition-all resize-none shadow-sm" />
                    </div>
                  </div>

                  {/* Address block */}
                  <div className="space-y-1 md:col-span-2 bg-cyan-50/30 border-2 border-cyan-100/60 p-5 sm:p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-200/20 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-cyan-700 uppercase tracking-wider pl-1">Aadhar Card Address*</label>
                      <textarea name="address_adhar" required rows={3} value={formData.address_adhar} onChange={handleChange} placeholder="Enter permanent address as on Aadhar Card" className="w-full px-4 py-3.5 sm:py-4 bg-white border border-cyan-100 rounded-2xl font-bold text-slate-700 text-sm outline-none resize-none shadow-sm focus:ring-8 focus:ring-cyan-100 focus:border-cyan-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-cyan-700 uppercase tracking-wider pl-1">Home / Parents Town Address*</label>
                      <textarea name="parents_address" required rows={3} value={formData.parents_address} onChange={handleChange} placeholder="Enter alternate home or parents' address" className="w-full px-4 py-3.5 sm:py-4 bg-white border border-cyan-100 rounded-2xl font-bold text-slate-700 text-sm outline-none resize-none shadow-sm focus:ring-8 focus:ring-cyan-100 focus:border-cyan-400" />
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
                      {relatives.map((rel, idx) => (
                        <div key={idx} className={`grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 ${idx > 0 ? "pt-6" : ""}`}>
                          
                          {/* Dropdown for Relation */}
                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider pl-1">Relation {idx + 1}*</label>
                            <select 
                              value={rel.relation} 
                              onChange={(e) => handleRelativeChange(idx, "relation", e.target.value)}
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
                              onChange={(e) => handleRelativeChange(idx, "name", e.target.value)}
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
                              onChange={(e) => handleRelativeChange(idx, "number", e.target.value)}
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
                  <button type="button" onClick={() => setStep(1)} className="w-full sm:w-auto font-black text-xs uppercase tracking-widest text-slate-400 px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-black text-xs uppercase tracking-[0.15em] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:scale-105 hover:shadow-indigo-500/25 active:scale-95 transition-all shadow-lg shadow-indigo-500/10">
                    Continue to Proofs
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ====================================
                STEP 3: VERIFICATION DOCUMENTS
               ==================================== */}
            {step === 3 && (
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
                      <input type="text" name="aadhar_number" required value={formData.aadhar_number} onChange={handleChange} placeholder="12 Digit Aadhar No." className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">PAN Card Number*</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input type="text" name="pan_card" required value={formData.pan_card} onChange={handleChange} placeholder="Alpha-numeric PAN" className="w-full pl-12 pr-4 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 text-sm focus:bg-white focus:ring-8 focus:ring-emerald-50 focus:border-emerald-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Upload Widgets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2 sm:pt-4">
                  
                  {/* File 1: Profile Photo (Pink Theme) */}
                  <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-pink-50/20 border-2 border-dashed border-pink-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-pink-400 transition-all shadow-sm">
                    <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-pink-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-pink-700">Personal Photo*</span>
                    <p className="text-[9px] text-pink-500/70 font-bold mt-1 leading-tight mb-4">Front portrait image.</p>
                    
                    {formData.photo_url ? (
                      <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase animate-in zoom-in-95">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full bg-white border border-pink-200 hover:border-pink-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-pink-600 hover:bg-pink-50 hover:text-pink-700 shadow-sm active:scale-95 transition-all">
                        {uploadingMap.photo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "photo")} className="hidden" disabled={uploadingMap.photo} />
                      </label>
                    )}
                  </div>

                  {/* File 2: Aadhar Card Copy (Sky Blue Theme) */}
                  <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-sky-50/20 border-2 border-dashed border-sky-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-sky-400 transition-all shadow-sm">
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-sky-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-700">Aadhar Copy*</span>
                    <p className="text-[9px] text-sky-500/70 font-bold mt-1 leading-tight mb-4">PDF or Image format.</p>
                    
                    {formData.adhar_card_copy_url ? (
                      <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase animate-in zoom-in-95">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full bg-white border border-sky-200 hover:border-sky-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-sky-600 hover:bg-sky-50 hover:text-sky-700 shadow-sm active:scale-95 transition-all">
                        {uploadingMap.adhar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, "adhar")} className="hidden" disabled={uploadingMap.adhar} />
                      </label>
                    )}
                  </div>

                  {/* File 3: PAN Card Copy (Amber/Gold Theme) */}
                  <div className="flex flex-col items-center justify-center p-5 sm:p-6 bg-amber-50/20 border-2 border-dashed border-amber-200 rounded-[1.5rem] sm:rounded-[2rem] text-center relative group hover:border-amber-400 transition-all shadow-sm">
                    <FileText className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 mb-3 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-700">PAN Card Copy*</span>
                    <p className="text-[9px] text-amber-500/70 font-bold mt-1 leading-tight mb-4">Front side scan copy.</p>
                    
                    {formData.pan_card_copy_url ? (
                      <div className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl flex items-center justify-center gap-1 font-black text-[10px] uppercase animate-in zoom-in-95">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full bg-white border border-amber-200 hover:border-amber-500 py-2.5 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-amber-600 hover:bg-amber-50 hover:text-amber-700 shadow-sm active:scale-95 transition-all">
                        {uploadingMap.pan ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choose File"}
                        <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, "pan")} className="hidden" disabled={uploadingMap.pan} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-100 text-[10px] sm:text-[11px] text-emerald-700 leading-relaxed font-bold flex items-start gap-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>By submitting this registration, you verify that all provided details are valid and authorize temple management to securely record and evaluate your Ashram database entry.</span>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between pt-4 items-center gap-3">
                  <button type="button" onClick={() => setStep(2)} className="w-full sm:w-auto font-black text-xs uppercase tracking-widest text-slate-400 px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-slate-50 transition-all">
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || Object.values(uploadingMap).includes(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs uppercase tracking-[0.18em] px-8 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-[1.8rem] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] sm:hover:scale-105 hover:shadow-emerald-500/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </form>

        <div className="text-center mt-8 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
           © {new Date().getFullYear()} Spiritual Echoes • Powered by ISKCON Desire Tree
        </div>

      </div>
    </div>
  );
}
