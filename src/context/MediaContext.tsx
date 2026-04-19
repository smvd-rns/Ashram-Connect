"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Track {
  id: string;
  name: string;
  url: string;
  lastPosition?: number;
}

interface MediaContextType {
  currentTrack: Track | null;
  playlist: Track[];
  autoplay: boolean;
  setAutoplay: (autoplay: boolean) => void;
  isPlaying: boolean;
  playbackSpeed: number;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playTrack: (track: Track, newPlaylist?: Track[]) => void;
  pauseTrack: () => void;
  togglePlay: () => void;
  stopTrack: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  savePosition: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [autoplay, setAutoplay] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("idkt-autoplay") !== "false";
    }
    return true;
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    localStorage.setItem("idkt-autoplay", String(autoplay));
  }, [autoplay]);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    
    // We use a ref for playNext to ensure the event listener has access to the latest state
    // but here we can also just handle it via useEffect if needed.
    // However, the simplest way is to handle it in a callback.
    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Handle autoplay when track ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (autoplay) {
        playNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [autoplay, currentTrack, playlist]); // Re-bind when playlist or currentTrack changes

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const playTrack = (track: Track, newPlaylist?: Track[]) => {
    if (audioRef.current) {
      if (newPlaylist) {
        setPlaylist(newPlaylist);
      }

      if (currentTrack?.id !== track.id) {
        audioRef.current.src = track.url;
        setCurrentTrack(track);
        
        // Resume logic: if track has a saved position, seek to it
        if (track.lastPosition && track.lastPosition > 0) {
          audioRef.current.currentTime = track.lastPosition;
          setProgress(track.lastPosition);
        }
      }
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (!playlist.length || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
      playTrack(playlist[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (!playlist.length || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    if (currentIndex > 0) {
      playTrack(playlist[currentIndex - 1]);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) pauseTrack();
    else if (currentTrack) playTrack(currentTrack);
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const savePosition = async () => {
    if (!currentTrack || !audioRef.current) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/user/audio-favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          audio_id: currentTrack.id,
          last_position: audioRef.current.currentTime,
          duration: audioRef.current.duration,
          is_update_only: false // Save it even if it was not in watch later yet
        })
      });

      if (!res.ok) {
        console.error("Failed to save audio position");
      }
    } catch (err) {
      console.error("Error saving audio position:", err);
    }
  };

  return (
    <MediaContext.Provider value={{ 
      currentTrack, 
      playlist,
      autoplay,
      setAutoplay,
      isPlaying, 
      playbackSpeed,
      progress,
      duration,
      volume,
      isMuted,
      playTrack, 
      pauseTrack, 
      togglePlay,
      stopTrack,
      playNext,
      playPrevious,
      setPlaybackSpeed,
      seek,
      setVolume,
      setIsMuted,
      savePosition
    }}>
      {children}
    </MediaContext.Provider>
  );
}

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) throw new Error("useMedia must be used within MediaProvider");
  return context;
}
