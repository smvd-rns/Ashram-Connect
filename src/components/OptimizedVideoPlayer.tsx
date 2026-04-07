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
  onStateChange?: (state: number) => void;
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
  onStateChange,
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
          },
          onStateChange: (event: any) => {
            setCurrentState(event.data);
            if (onStateChange) onStateChange(event.data);
            const isPlaying = event.data === (window as any).YT?.PlayerState?.PLAYING;
            if (isPlaying) {
              updateMediaSession();
              wasPlayingRef.current = true;
            } else if (event.data === (window as any).YT?.PlayerState?.PAUSED) {
              wasPlayingRef.current = false;
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

      if (document.hidden) {
        // Tab is hidden. If it was playing just before, force resume.
        if (wasPlayingRef.current) {
          // 150ms timeout to allow any browser "auto-pause" to finish before we force "play"
          setTimeout(() => {
            playerInstance.current?.playVideo();
            if ('mediaSession' in navigator) {
              navigator.mediaSession.playbackState = "playing";
            }
          }, 150);
        }
      } else {
        // Tab is visible again.
        if (wasPlayingRef.current) {
          playerInstance.current?.playVideo();
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
          {/* Bottom Right Shield (Covers YouTube Logo/Watermark) */}
          <div 
            className="absolute bottom-0 right-0 w-[15%] h-[15%] z-[9999] cursor-default pointer-events-auto bg-white/[0.01] touch-none"
            title="Privacy Restricted"
            onClickCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
            onTouchStartCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
            onContextMenuCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
          />

          {/* Top Left Shield (Covers Title and Channel branding) */}
          <div 
            className="absolute top-0 left-0 w-[80%] h-[20%] z-[9999] cursor-default pointer-events-auto bg-white/[0.01] touch-none"
            onClickCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
            onTouchStartCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
            onContextMenuCapture={(e) => {
              e.stopPropagation(); e.preventDefault();
              openExternal(`https://www.youtube.com/watch?v=${videoId}`);
            }}
          />

          {/* 
              PAUSED INTERCEPTOR: When paused, YouTube displays a "More Videos" grid.
              We place an overlay above the controls to block these related video clicks
              while allowing the user to click to Resume.
          */}
          {currentState === (window as any).YT?.PlayerState?.PAUSED && (
            <div 
              className="absolute inset-x-0 top-0 bottom-[14%] z-[9998] bg-black/5 backdrop-blur-[1px] flex items-center justify-center cursor-pointer group pointer-events-auto bg-white/[0.01] touch-none"
              onClickCapture={(e) => {
                e.stopPropagation(); e.preventDefault();
                playerInstance.current?.playVideo();
              }}
              onTouchStartCapture={(e) => {
                e.stopPropagation(); e.preventDefault();
                playerInstance.current?.playVideo();
              }}
            >
               <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                  </div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
