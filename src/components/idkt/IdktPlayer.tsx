"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, Music, X, Settings, Bookmark, Check } from "lucide-react";
import { useMedia } from "@/context/MediaContext";

export default function IdktPlayer() {
  const { 
    currentTrack, 
    playlist,
    autoplay,
    setAutoplay,
    isPlaying, 
    togglePlay, 
    stopTrack, 
    playNext,
    playPrevious,
    playbackSpeed, 
    setPlaybackSpeed,
    progress,
    duration,
    volume,
    isMuted,
    seek,
    setVolume,
    setIsMuted,
    savePosition
  } = useMedia();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMobileExtra, setShowMobileExtra] = useState(false);
  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  if (!currentTrack) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const getSpeakerName = (item: any) => {
    const path = (item as any).full_path || "";
    if (path.includes("01_-_Srila_Prabhupada")) return "Srila Prabhupada";
    
    // Simple heuristic for speaker names from paths
    const segments = path.split("/");
    for (const segment of segments) {
      if (segment.includes("His_Holiness_") || segment.includes("His_Grace_") || segment.includes("Srila_")) {
        return segment
          .replace(/His_Holiness_/gi, "")
          .replace(/His_Grace_/gi, "")
          .replace(/Srila_/gi, "")
          .replace(/_/g, " ")
          .trim();
      }
    }
    return "Audio Lecture";
  };

  return (
    <div className="fixed bottom-[88px] sm:bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-4xl z-[100] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white/95 backdrop-blur-2xl border border-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-6 flex flex-col gap-2 sm:gap-3 relative">
        
        {/* Close Button */}
        <button 
          onClick={stopTrack}
          className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-7 h-7 sm:w-8 sm:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-20 border-2 border-white"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Track Title - Above Progress Bar */}
        <div className="px-2 sm:px-4 pt-1 sm:pt-2">
          <h4 className="text-[10px] sm:text-xs font-black text-slate-900 truncate tracking-tight leading-tight uppercase">
            {currentTrack.name}
          </h4>
          <p className="text-[7px] sm:text-[9px] font-bold text-orange-600/70 uppercase tracking-[0.2em] mt-0.5">
            ISKCON Desire Tree • {getSpeakerName(currentTrack)}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="group relative w-full h-4 sm:h-2 bg-slate-100 rounded-full cursor-pointer flex items-center px-0.5 mt-1 sm:mt-0">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="absolute inset-x-0 -top-1 bottom-0 w-full opacity-0 z-20 cursor-pointer"
          />
          <div className="relative w-full h-1.5 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-linear-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-100"
              style={{ width: `${(progress / (duration || 1)) * 100}%` }}
            />
          </div>
          {/* Slider Thumb Handle */}
          <div 
            className="absolute h-4 w-4 sm:h-3.5 sm:w-3.5 bg-white border-2 border-orange-500 rounded-full shadow-lg z-10 transition-all duration-100 pointer-events-none"
            style={{ 
              left: `calc(${(progress / (duration || 1)) * 100}% - 8px)`,
              opacity: progress > 0 ? 1 : 0
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Controls Section */}
          <div className="flex items-center gap-1 sm:gap-4 shrink-0">
            <button 
              onClick={playPrevious}
              disabled={!playlist.length || playlist.findIndex(t => t.id === currentTrack?.id) === 0}
              className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 hover:text-orange-600 disabled:opacity-20 disabled:hover:text-slate-400 transition-all rounded-full hover:bg-orange-50 flex items-center justify-center shrink-0"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>
            <button 
              onClick={togglePlay}
              className="w-10 h-10 sm:w-14 sm:h-14 bg-linear-to-br from-indigo-600 to-indigo-700 text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-indigo-100 active:scale-95 shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current ml-0.5" />}
            </button>
            <button 
              onClick={playNext}
              disabled={!playlist.length || playlist.findIndex(t => t.id === currentTrack?.id) === playlist.length - 1}
              className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 hover:text-orange-600 disabled:opacity-20 disabled:hover:text-slate-400 transition-all rounded-full hover:bg-orange-50 flex items-center justify-center shrink-0"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Manual Save Button */}
            <button 
              onClick={async () => {
                setSaveStatus('saving');
                await savePosition();
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 2000);
              }}
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl border transition-all active:scale-95 shadow-sm ${
                saveStatus === 'success' 
                  ? "bg-emerald-500 border-emerald-400 text-white" 
                  : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-100"
              }`}
              title={saveStatus === 'success' ? "Position Saved!" : "Save playback position"}
            >
              {saveStatus === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Bookmark className={`w-4 h-4 ${saveStatus === 'saving' ? 'animate-bounce' : ''}`} />
              )}
            </button>
          </div>

          {/* Right Section / Extra Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end shrink-0">
            <div className="text-[9px] sm:text-[10px] font-black text-slate-400 tabular-nums bg-slate-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-slate-100">
              {formatTime(progress)}
            </div>
            
            {/* Desktop Extras */}
            <div className="hidden sm:flex items-center gap-4">
              {/* Autoplay Toggle */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Autoplay</span>
                <button 
                  onClick={() => setAutoplay(!autoplay)}
                  className={`w-8 h-4 rounded-full relative transition-colors ${autoplay ? "bg-orange-500" : "bg-slate-200"}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoplay ? "left-4.5" : "left-0.5"}`} />
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-[10px] font-black text-slate-600 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-full border border-slate-200 bg-white"
                >
                  {playbackSpeed}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-4 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[80px] animate-in slide-in-from-bottom-2 duration-200">
                    {speedOptions.map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-xl transition-colors ${playbackSpeed === speed ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 group/vol">
                <button onClick={() => setIsMuted(!isMuted)}>
                  <Volume2 className="w-5 h-5 text-slate-400 hover:text-orange-600 transition-colors shrink-0" />
                </button>
                <div className="w-16 lg:w-20 h-1 bg-slate-100 rounded-full relative overflow-hidden">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-400 rounded-full group-hover/vol:bg-orange-500 transition-all"
                    style={{ width: `${volume * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Toggle */}
            <div className="sm:hidden relative">
              <button 
                onClick={() => setShowMobileExtra(!showMobileExtra)}
                className="p-2 text-slate-400 hover:text-orange-500 bg-slate-50 rounded-full active:bg-orange-50 transition-colors"
              >
                <Settings className={`w-4 h-4 ${showMobileExtra ? 'rotate-90' : ''} transition-transform duration-300`} />
              </button>
              
              {showMobileExtra && (
                <div className="absolute bottom-full right-0 mb-4 bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 min-w-[160px] animate-in slide-in-from-bottom-2 duration-200 z-50">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Playback Settings</p>
                  
                  <div className="space-y-4">
                    {/* Mobile Autoplay Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                      <p className="text-[10px] font-bold text-slate-600">Autoplay Next</p>
                      <button 
                        onClick={() => setAutoplay(!autoplay)}
                        className={`w-8 h-4 rounded-full relative transition-colors ${autoplay ? "bg-orange-500" : "bg-slate-200"}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoplay ? "left-4.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    {/* Mobile Speed Controls */}
                    <div>
                      <div className="grid grid-cols-3 gap-1">
                        {speedOptions.map(speed => (
                          <button
                            key={speed}
                            onClick={() => setPlaybackSpeed(speed)}
                            className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors ${playbackSpeed === speed ? "bg-orange-600 text-white" : "bg-slate-50 text-slate-600"}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Mobile Volume Slider */}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                      <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="flex-1 h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
