"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

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

    navigator.mediaSession.setActionHandler("play", () => playerInstance.current?.playVideo());
    navigator.mediaSession.setActionHandler("pause", () => playerInstance.current?.pauseVideo());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        playerInstance.current?.seekTo(details.seekTime);
      }
    });
  };

  // 2. Initialize/Update Player Instance
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
            if (onStateChange) onStateChange(event.data);
            if (event.data === window.YT.PlayerState.PLAYING) {
              updateMediaSession();
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

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [playerReady, videoId, timedOut]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4. Persistence Logic: Prevent pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && playerInstance.current && playerInstance.current.getPlayerState() === (window as any).YT?.PlayerState?.PLAYING) {
        setTimeout(() => playerInstance.current?.playVideo(), 150);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
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
    </div>
  );
}
