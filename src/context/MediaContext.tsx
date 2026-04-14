"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

interface Track {
  id: string;
  name: string;
  url: string;
}

interface MediaContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playbackSpeed: number;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  togglePlay: () => void;
  stopTrack: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

export function MediaProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

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

  const playTrack = (track: Track) => {
    if (audioRef.current) {
      if (currentTrack?.id !== track.id) {
        audioRef.current.src = track.url;
        setCurrentTrack(track);
      }
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
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

  return (
    <MediaContext.Provider value={{ 
      currentTrack, 
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
      setPlaybackSpeed,
      seek,
      setVolume,
      setIsMuted
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
