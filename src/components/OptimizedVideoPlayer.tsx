"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { openExternal } from "@/lib/device";

interface OptimizedVideoPlayerProps {
  videoId: string;
  title: string;
  artist?: string;
  album?: string;
  thumbnail?: string;
  initialTime?: number;
  onStateChange?: (state: number) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  className?: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function OptimizedVideoPlayer({
  videoId,
  title,
  artist = "Devotional Library",
  album = "Spiritual Echoes",
  thumbnail,
  initialTime = 0,
  onStateChange,
  onProgress,
  className = ""
}: OptimizedVideoPlayerProps) {
  const [playerReady, setPlayerReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerInstance = useRef<any>(null);
  const [currentState, setCurrentState] = useState<number | null>(null);
  const playerContainerId = useRef(`player-${Math.random().toString(36).substr(2, 9)}`);

  // Fallback URL for standard iframe (Used if JS API fails or is blocked)
  const fallbackUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;

  // 1. Load YouTube IFrame API Script (Globally once)
  useEffect(() => {
    const checkYT = () => {
      if (window.YT && window.YT.Player && window.YT.PlayerState) {
        setPlayerReady(true);
        return true;
      }
      return false;
    };

    if (checkYT()) return;

    // AUTO-FALLBACK: If the API doesn't load in 3.5 seconds, we use a standard iframe
    // This fixed the "Stuck on Initializing" issue on high-security laptops/ad-blockers
    const fallbackTimer = setTimeout(() => {
      if (!window.YT || !window.YT.Player) {
        console.warn("[YT-PLAYER] Using Standard Fallback (API slow/blocked)");
        setTimedOut(true);
      }
    }, 3500);

    if (!document.getElementById("youtube-api-script")) {
      const tag = document.createElement("script");
      tag.id = "youtube-api-script";
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      const previousOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousOnReady) previousOnReady();
        setPlayerReady(true);
      };
    }

    // Polling as a safety net
    const interval = setInterval(() => {
      if (checkYT()) {
        clearInterval(interval);
        clearTimeout(fallbackTimer);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Media Session API Sync
  const updateMediaSession = () => {
    if (!("mediaSession" in navigator)) return;

    const metadata = {
      title: title,
      artist: artist,
      album: album,
      artwork: [
        { 
          src: thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, 
          sizes: "512x512", 
          type: "image/jpeg" 
        },
      ],
    };

    navigator.mediaSession.metadata = new (window as any).MediaMetadata(metadata);
    navigator.mediaSession.playbackState = playerInstance.current?.getPlayerState() === (window as any).YT?.PlayerState?.PLAYING ? "playing" : "paused";

    navigator.mediaSession.setActionHandler("play", () => {
      playerInstance.current?.playVideo();
      navigator.mediaSession.playbackState = "playing";
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      playerInstance.current?.pauseVideo();
      navigator.mediaSession.playbackState = "paused";
    });
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        playerInstance.current?.seekTo(details.seekTime);
      }
    });
  };

  // 2. Initialize/Update Player Instance
  const wasPlayingRef = useRef(false);
  const seekPerformedRef = useRef(false);

  useEffect(() => {
    // Reset seek flag when videoId changes
    seekPerformedRef.current = false;
  }, [videoId]);

  useEffect(() => {
    if (!playerReady || !videoId || timedOut) return;

    if (!playerInstance.current) {
      playerInstance.current = new window.YT.Player(playerContainerId.current, {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => {
             updateMediaSession();
             if (initialTime > 0) {
               playerInstance.current?.seekTo(initialTime, true);
               seekPerformedRef.current = true;
             }
          },
          onStateChange: (event: any) => {
            setCurrentState(event.data);
            if (onStateChange) onStateChange(event.data);
            const isPlaying = event.data === (window as any).YT?.PlayerState?.PLAYING;
            const isPaused = event.data === (window as any).YT?.PlayerState?.PAUSED;
            
            if (isPlaying) {
              updateMediaSession();
              wasPlayingRef.current = true;
              
              // Fallback seek: if onReady seek didn't work or was skipped, try here once
              if (!seekPerformedRef.current && initialTime > 0) {
                playerInstance.current?.seekTo(initialTime, true);
                seekPerformedRef.current = true;
              }
            } else if (isPaused) {
              if (!document.hidden) {
                wasPlayingRef.current = false;
              }
            }
          },
          onError: () => {
             setTimedOut(true); 
          }
        },
      });
    } else if (playerInstance.current.loadVideoById) {
      playerInstance.current.loadVideoById(videoId);
      updateMediaSession();
    }

    // Security: Apply sandbox to the generated iframe to prevent navigation
    const applySandbox = () => {
      const iframe = document.getElementById(playerContainerId.current) as HTMLIFrameElement;
      if (iframe && iframe.tagName === "IFRAME") {
        // Essential flags for YT to work but WITHOUT top-navigation or popups
        iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-presentation");
      }
    };

    const timer = setTimeout(applySandbox, 1000); // Wait for API to replace DIV

    return () => {
      clearTimeout(timer);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [playerReady, videoId, timedOut]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Persistence Logic: Prevent pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (!playerInstance.current || !window.YT) return;

      if (!document.hidden) {
        // Tab is visible again — resume if it was playing before the tab switch.
        if (wasPlayingRef.current) {
          // Small delay to let the browser fully restore the tab before calling play.
          setTimeout(() => {
            playerInstance.current?.playVideo();
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          }, 150);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, []);

  // 5. Progress Tracking
  useEffect(() => {
    if (!onProgress || !playerInstance.current || currentState !== (window as any).YT?.PlayerState?.PLAYING) {
      return;
    }

    const interval = setInterval(() => {
      if (playerInstance.current?.getCurrentTime) {
        const currentTime = playerInstance.current.getCurrentTime();
        const duration = playerInstance.current.getDuration();
        onProgress(currentTime, duration);
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [currentState, onProgress]);

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      {/* 
         IF READY OR LOADING: Show API Div Target
         IF TIMED OUT: Show Standard Iframe Fallback
      */}
      {!timedOut ? (
        <div id={playerContainerId.current} className="w-full h-full" />
      ) : (
        <iframe
          src={fallbackUrl}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        />
      )}

      {/* Loading Overlay (Only if not ready AND not timed out) */}
      {!playerReady && !timedOut && videoId && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 text-devo-500 animate-spin mx-auto" />
            <p className="text-white font-bold text-[10px] uppercase tracking-[0.2em] px-4 animate-pulse">
              Optimizing Connection...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !timedOut && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center z-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-white font-bold text-sm mb-6">{error}</p>
          <button
            onClick={() => { setError(null); playerInstance.current?.loadVideoById(videoId); }}
            className="px-6 py-3 bg-devo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-devo-700 transition-all"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* 
          UI SHIELDS: These transparent layers catch clicks on known "Leak" points
          (YouTube logo, Title, Channel link) and redirect them to our Policy Modal.
      */}
      {playerReady && !timedOut && (
        <>
          {/* Bottom Right Logo Shield — specifically targets the YouTube watermark while leaving full-screen open */}
          <div 
            className="absolute bottom-[35px] right-[48px] w-[60px] h-[30px] z-[9999] cursor-default pointer-events-auto bg-transparent"
            title="Temple Media Policy"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
          />

          {/* Aggressive Full-Width Top Shield — Covers Title, Share, More, and all top navigation */}
          <div 
            className="absolute top-0 left-0 w-full h-[15%] z-[10000] cursor-default pointer-events-auto bg-transparent"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
          />

          {/* Bottom Left Shield — covers the "Watch on YouTube" and "More videos" popup triggers */}
          <div 
            className="absolute bottom-[35px] left-0 w-[12%] h-[60px] z-[10000] cursor-default pointer-events-auto bg-transparent"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
          />

          {/* Bottom Right Shield — selectively covers the "More videos" thumbnail button */}
          <div 
            className="absolute bottom-[35px] right-[100px] w-[15%] h-[60px] z-[10000] cursor-default pointer-events-auto bg-transparent"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); openExternal(`https://www.youtube.com/watch?v=${videoId}`); }}
          />
        </>
      )}
    </div>
  );
}
