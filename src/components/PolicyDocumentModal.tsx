"use client";

import React from "react";
import { X, ExternalLink, Download, FileText, Loader2 } from "lucide-react";

interface PolicyDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  driveUrl: string;
}

export default function PolicyDocumentModal({ isOpen, onClose, title, driveUrl }: PolicyDocumentModalProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  if (!isOpen) return null;

  // Helper to convert Google Drive links to embeddable preview links
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    const driveMatch = url.match(/(?:\/d\/|id=)([\w-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(driveUrl);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 md:p-10 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full h-full max-w-6xl bg-white shadow-2xl overflow-hidden flex flex-col rounded-[2rem] sm:rounded-[3rem] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-devo-50 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-devo-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-xl font-black text-slate-900 truncate tracking-tight uppercase font-outfit">
                {title}
              </h3>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                Official Ashram Policy
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-devo-600 hidden sm:flex"
              title="Open in Google Drive"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button 
              onClick={onClose}
              className="p-2.5 bg-slate-50 sm:bg-transparent hover:bg-rose-50 rounded-xl transition-colors text-slate-400 hover:text-rose-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Content */}
        <div className="flex-1 relative bg-slate-50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-50">
               <div className="flex flex-col items-center gap-3 text-slate-400 animate-in fade-in duration-300">
                  <Loader2 className="w-8 h-8 animate-spin text-devo-600" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest italic">Authenticating Secure Document...</span>
               </div>
            </div>
          )}
          <iframe 
            src={embedUrl}
            className={`w-full h-full relative z-10 border-none transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
            allow="autoplay"
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Footer info (Mobile friendly) */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
           <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">NVCC Media Compliance</p>
           <a 
              href={driveUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-devo-600 font-black text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              <span className="hidden sm:inline">Open Original</span>
              <span className="sm:hidden">Full Link</span>
              <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
            </a>
        </div>
      </div>
    </div>
  );
}
