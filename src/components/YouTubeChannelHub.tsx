"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  SlidersHorizontal, ChevronDown, Check,
  Search, Play, Radio, Film, Layers, ExternalLink,
  Loader2, X, Clock, CheckCircle2,
  Heart, Bookmark, Share2, Video, AlertCircle, Grid
} from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import OptimizedVideoPlayer from "./OptimizedVideoPlayer";
import { openExternal } from "@/lib/device";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  date?: string;
  published: string;
  type: "video" | "live" | "short" | "playlist";
  playlistCount?: number;
  channelId?: string;
  channelTitle?: string;
}

interface Channel {
  id: string;          // Database UUID
  channel_id: string;   // UCxx format
  name: string;
  handle: string;
  custom_logo: string;  // Manually uploaded to Supabase
  banner_style: string;
}

const tabs = [
  { id: "videos", label: "Videos", icon: Play },
  { id: "playlists", label: "Playlists", icon: Layers },
];

export default function YouTubeChannelHub() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState("videos");
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlaylistName, setActivePlaylistName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [contentCache, setContentCache] = useState<Record<string, any>>({});
  const [logoCache, setLogoCache] = useState<Record<string, string>>({});
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalResults, setGlobalResults] = useState<VideoItem[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [fetchedVideoMetadata, setFetchedVideoMetadata] = useState<Record<string, VideoItem>>({});
  const filterRef = useRef<HTMLDivElement>(null);

  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchChannels = async () => {
      setLoadingChannels(true);
      try {
        const res = await fetch("/api/youtube/channels");
        const data = await res.json();
        if (data.channels?.length > 0) {
          setChannels(data.channels);
          
          const urlChannelId = searchParams.get("channel");
          const urlPlaylistId = searchParams.get("playlist");
          const urlVideoId = searchParams.get("v");

          if (urlChannelId) {
            const found = data.channels.find((c: any) => c.channel_id === urlChannelId);
            if (found) {
              setActiveChannel(found);
              if (urlPlaylistId) setActivePlaylistId(urlPlaylistId);
              if (urlVideoId) setActiveVideoId(urlVideoId);
            }
          }
        }
      } catch (err) {
        setError("Failed to load portal configuration.");
      } finally {
        setLoadingChannels(false);
      }
    };
    fetchChannels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const urlChannelId = searchParams.get("channel");
    const urlPlaylistId = searchParams.get("playlist");
    const urlVideoId = searchParams.get("v");

    if (!urlChannelId) {
      if (activeChannel) {
        setActiveChannel(null);
        setActivePlaylistId(null);
        setActiveVideoId(null);
      }
      return;
    }
    
    if (channels.length > 0) {
      const matched = channels.find(c => c.channel_id === urlChannelId);
      if (matched && matched.channel_id !== activeChannel?.channel_id) {
        setActiveChannel(matched);
      }
      
      // Only set if they exist in URL and differ from current state
      // This prevents the "null" in URL from fighting with the "auto-select" logic
      if (urlPlaylistId && urlPlaylistId !== activePlaylistId) {
        setActivePlaylistId(urlPlaylistId);
      }
      if (urlVideoId && urlVideoId !== activeVideoId) {
        setActiveVideoId(urlVideoId);
      }
    }
  }, [searchParams, channels, activeChannel?.channel_id, activePlaylistId, activeVideoId]);

  const currentTabContent = activeChannel 
    ? (contentCache[activeChannel.channel_id]?.[activeTab]?.[activePlaylistId || "main"] || { items: [], token: "" })
    : { items: [], token: "" };
    
  const videos = currentTabContent.items;
  const nextPageToken = currentTabContent.token;
  const activeLogo = activeChannel?.custom_logo || (activeChannel ? logoCache[activeChannel.channel_id] : null);

  const fetchContent = useCallback(async (channel: Channel, tab: string, isLoadMore = false) => {
    if (!channel) return;
    const pId = activePlaylistId || "main";
    const cacheKey = `${channel.channel_id}-${tab}-${pId}`;
    const currentVideosCount = contentCache[channel.channel_id]?.[tab]?.[pId]?.items?.length || 0;
    if (!isLoadMore && fetchedRef.current.has(cacheKey) && currentVideosCount > 0) return;

    if (isLoadMore) setLoadMoreLoading(true);
    else {
      setLoading(true);
      fetchedRef.current.add(cacheKey);
    }
    setError(null);

    try {
      const pageToken = isLoadMore ? nextPageToken : "";
      const plParam = activePlaylistId ? `&playlistId=${activePlaylistId}` : "";
      const tParam = `&_t=${Date.now()}`;
      const res = await fetch(`/api/youtube?channelId=${channel.channel_id}&type=${tab}&pageToken=${pageToken}${plParam}${tParam}`);
      const data = await res.json();
      
      if (!res.ok) {
        fetchedRef.current.delete(cacheKey);
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setContentCache((prev) => {
        const channelCache = prev[channel.channel_id] || {};
        const tabCache = channelCache[tab] || {};
        const plCache = tabCache[pId] || { items: [], token: "" };
        return {
          ...prev,
          [channel.channel_id]: {
            ...channelCache,
            [tab]: {
              ...tabCache,
              [pId]: {
                items: isLoadMore ? [...plCache.items, ...data.items] : data.items,
                token: data.nextPageToken || ""
              }
            }
          }
        };
      });

      if (data.channelLogo) {
        setLogoCache((prev) => ({ ...prev, [channel.channel_id]: data.channelLogo }));
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not load content.");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadMoreLoading(false);
    }
  }, [nextPageToken, activePlaylistId, contentCache]);

  useEffect(() => {
    if (activeChannel) fetchContent(activeChannel, activeTab);
  }, [activeChannel, activeTab, activePlaylistId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const performGlobalSearch = async () => {
      if (!searchQuery.trim()) {
        setGlobalResults([]);
        return;
      }

      // If we are in a channel view, or have filters, or a long enough query
      if (selectedChannelIds.length === 0 && activeChannel && searchQuery.length < 3) {
        setGlobalResults([]);
        return;
      }

      setIsSearchingGlobal(true);
      try {
        let url = `/api/youtube/search?q=${encodeURIComponent(searchQuery)}`;
        if (selectedChannelIds.length > 0) {
          url += `&channelId=${selectedChannelIds.join(',')}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
          setGlobalResults(data.items || []);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const timer = setTimeout(performGlobalSearch, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedChannelIds, activeChannel]);

  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isShowingPlaylist = activePlaylistId !== null;
    const isMainVideoTab = activeTab === "videos" && !isShowingPlaylist;

    if (!activeVideoId && videos.length > 0 && (isMainVideoTab || isShowingPlaylist)) {
      setActiveVideoId(videos[0].id);
      setIsLive(videos[0].type === "live");
    }
  }, [videos, activeVideoId, activeTab, activePlaylistId]);

  useEffect(() => {
    if (!activeVideoId) return;

    // Check if it's already in some cache
    const isCached = videos.some((v: VideoItem) => v.id === activeVideoId) || 
                     globalResults.some((v: VideoItem) => v.id === activeVideoId) ||
                     Object.values(contentCache).some((ch: any) => 
                       Object.values(ch).some((tabs: any) => 
                         Object.values(tabs).some((pl: any) => 
                           pl.items.some((v: any) => v.id === activeVideoId)
                         )
                       )
                     );

    if (!isCached && !fetchedVideoMetadata[activeVideoId]) {
      const fetchMetadata = async () => {
        try {
          const res = await fetch(`/api/youtube?videoId=${activeVideoId}`);
          if (res.ok) {
            const data = await res.json();
            setFetchedVideoMetadata(prev => ({ ...prev, [activeVideoId]: data }));
          }
        } catch (err) {
          console.error("Failed to fetch one-off video metadata:", err);
        }
      };
      fetchMetadata();
    }
  }, [activeVideoId, videos, globalResults, contentCache, fetchedVideoMetadata]);

  const filteredVideos = videos.filter((v: VideoItem) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVideo = (() => {
    if (!activeVideoId) return null;
    // 1. Check current channel videos
    const fromChannel = videos.find((v: VideoItem) => v.id === activeVideoId);
    if (fromChannel) return fromChannel;
    
    // 2. Check global search results (important if clicked from search)
    const fromGlobal = globalResults.find((v: VideoItem) => v.id === activeVideoId);
    if (fromGlobal) return fromGlobal;

    // 3. Check one-off fetched metadata
    if (fetchedVideoMetadata[activeVideoId]) return fetchedVideoMetadata[activeVideoId];
    
    // 4. Fallback: Search all channel caches
    for (const chId in contentCache) {
      for (const tab in contentCache[chId]) {
        for (const plId in contentCache[chId][tab]) {
           const found = contentCache[chId][tab][plId].items.find((v: any) => v.id === activeVideoId);
           if (found) return found;
        }
      }
    }
    return null;
  })();

  const handleVideoSelect = (vid: VideoItem) => {
    if (vid.type === "playlist") {
      setActivePlaylistId(vid.id);
      setActivePlaylistName(vid.title);
      setActiveVideoId(null);
      // Sync URL
      const query = new URLSearchParams(searchParams.toString());
      query.set("playlist", vid.id);
      query.delete("v");
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
      return;
    }
    
    setActiveVideoId(vid.id);
    setIsLive(vid.type === "live");
    
    // Sync URL
    const query = new URLSearchParams(searchParams.toString());
    query.set("v", vid.id);
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
    
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!activeChannel) {
    return (
      <div className="min-h-screen bg-slate-50 py-10 sm:py-16 px-4">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          <div className="text-center space-y-3 sm:space-y-5 max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-3xl sm:text-6xl font-outfit font-black text-devo-950 tracking-tight leading-tight">
              Spiritual <span className="text-transparent bg-clip-text bg-gradient-to-r from-devo-600 to-accent-gold">Library</span>
            </h1>
            <p className="text-xs sm:text-base text-devo-800 font-bold opacity-60 uppercase tracking-[0.2em]">Select a channel or search below</p>
            <div className="relative mt-8 sm:mt-12 max-w-2xl mx-auto flex gap-3 px-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-devo-500/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-devo-400" />
                  <input 
                    type="text"
                    placeholder="Search across wisdom library..."
                    className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl font-bold text-sm sm:text-base shadow-xl focus:border-devo-500 outline-none transition-all placeholder:text-slate-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {isSearchingGlobal && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-devo-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Select Channel Dropdown Filter */}
              <div className="relative" ref={filterRef}>
                 <button 
                   onClick={() => setIsFilterOpen(!isFilterOpen)}
                   className={`h-full px-6 flex items-center gap-3 bg-white border-2 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${
                     selectedChannelIds.length > 0 ? "border-devo-500 text-devo-600 bg-devo-50/50" : "border-slate-100 text-slate-400"
                   }`}
                 >
                   <SlidersHorizontal className="w-4 h-4" />
                   <span className="hidden sm:inline">
                     {selectedChannelIds.length === 0 ? "All Channels" : `${selectedChannelIds.length} Teachers`}
                   </span>
                   <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isFilterOpen ? "rotate-180" : ""}`} />
                 </button>

                 {isFilterOpen && (
                   <div className="absolute top-full mt-4 right-0 w-72 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filter Teachers</span>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setSelectedChannelIds(channels.map(c => c.channel_id))}
                            className="text-[9px] font-black text-devo-600 hover:text-devo-950 uppercase"
                          >
                            All
                          </button>
                          <button 
                            onClick={() => setSelectedChannelIds([])}
                            className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                        {channels.map((ch) => {
                          const isSelected = selectedChannelIds.includes(ch.channel_id);
                          return (
                            <button
                              key={ch.id}
                              onClick={() => {
                                setSelectedChannelIds(prev => 
                                  isSelected ? prev.filter(id => id !== ch.channel_id) : [...prev, ch.channel_id]
                                );
                              }}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${
                                isSelected ? "bg-devo-50 text-devo-900" : "hover:bg-slate-50 text-slate-600"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-devo-500 border-devo-500" : "border-slate-200"
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-slate-100">
                                <Image src={ch.custom_logo || logoCache[ch.channel_id]} alt={ch.name} width={32} height={32} className="object-cover" unoptimized />
                              </div>
                              <span className="text-[11px] font-bold truncate text-left flex-1">{ch.name}</span>
                            </button>
                          );
                        })}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          </div>

          {searchQuery ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-6 gap-4">
                  <div className="flex flex-col items-center sm:items-start gap-1">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">LECTURE SEARCH RESULTS ({globalResults.length})</h2>
                    {selectedChannelIds.length > 0 && (
                      <p className="text-[10px] font-bold text-devo-600 uppercase tracking-widest">
                        Filtering by: {selectedChannelIds.length} Selected Teachers
                      </p>
                    )}
                  </div>
                  <button onClick={() => { setSearchQuery(""); setSelectedChannelIds([]); }} className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg">Back to Library</button>
                </div>
               {globalResults.length === 0 && !isSearchingGlobal ? (
                 <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <X className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching lectures found in our library</p>
                 </div>
               ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                    {globalResults.map((item: any, i) => {
                      const isPlaylist = item.type === "playlist";
                      const isLiveItem = item.type === "live";
                      
                      return (
                        <button 
                           key={item.id + i}
                           onClick={() => {
                             const query = new URLSearchParams();
                             query.set("channel", item.channelId || item.channel_id);
                             if (isPlaylist) {
                               query.set("playlist", item.id);
                             } else {
                               query.set("v", item.id);
                             }
                             setSearchQuery(""); 
                             router.push(`${pathname}?${query.toString()}`);
                           }}
                           className="group flex flex-col text-left"
                        >
                           <div className="relative w-full aspect-video">
                              {/* Playlist Stack Effect - confined to thumbnail area */}
                              {isPlaylist && (
                                <>
                                  <div className="absolute -top-1.5 left-0 right-0 h-full bg-slate-200/80 rounded-3xl -z-10 translate-y-1 scale-x-[0.96] border border-slate-300/30" />
                                  <div className="absolute -top-3 left-0 right-0 h-full bg-slate-300/60 rounded-3xl -z-20 translate-y-2 scale-x-[0.92] border border-slate-400/20" />
                                </>
                              )}

                              <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-sm group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-500 border border-slate-100 bg-slate-200">
                                 <Image src={item.thumbnail} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" unoptimized />
                                 
                                 {/* Overlay Icons */}
                                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    {isPlaylist ? (
                                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Layers className="w-6 h-6 text-white" />
                                      </div>
                                    ) : (
                                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Play className="w-6 h-6 text-white ml-1" />
                                      </div>
                                    )}
                                 </div>

                                 {/* Badges */}
                                 <div className="absolute bottom-3 right-3 flex gap-2">
                                    {isLiveItem && (
                                      <div className="px-2 py-1 bg-red-600 rounded-lg flex items-center gap-1.5 shadow-lg border border-red-500">
                                         <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                         <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE</span>
                                      </div>
                                    )}
                                    <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-widest border border-white/20 shadow-lg">
                                      {isPlaylist ? `${item.playlistCount || 0} VIDEOS` : "LECTURE"}
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="pt-4 px-1 space-y-2.5">
                              <h3 className="font-outfit font-black text-xs sm:text-[13px] text-devo-950 line-clamp-2 leading-snug group-hover:text-devo-600 transition-colors">
                                {item.title}
                              </h3>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                  {isPlaylist ? <Layers className="w-3 h-3 text-slate-400" /> : <Video className="w-3 h-3 text-slate-400" />}
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-widest">{item.channelTitle || "Devotional Library"}</p>
                              </div>
                           </div>
                        </button>
                      );
                    })}
                  </div>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6">
              {loadingChannels ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="w-full h-[180px] sm:h-[240px] rounded-[2rem] sm:rounded-[3rem] bg-slate-200 border border-slate-100" />
                    <div className="space-y-2 px-4 flex flex-col items-center">
                      <div className="h-3 bg-slate-200 rounded-full w-2/3" />
                      <div className="h-2 bg-slate-100 rounded-full w-1/3" />
                    </div>
                  </div>
                ))
              ) : (
                channels.map((channel, i) => (
                  <button 
                    key={channel.id}
                    onClick={() => router.push(`${pathname}?channel=${channel.channel_id}`)}
                    className="group flex flex-col items-center gap-4 animate-in zoom-in duration-700"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] h-auto rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:scale-[1.05] active:scale-95 border border-slate-100 bg-slate-100">
                      {channel.custom_logo || logoCache[channel.channel_id] ? (
                        <Image 
                          src={channel.custom_logo || logoCache[channel.channel_id]} 
                          alt={channel.name} 
                          fill 
                          className="object-cover group-hover:scale-110 transition-transform duration-700" 
                          unoptimized 
                          priority={i < 8}
                          loading={i < 8 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
                          <Video className="w-12 h-12 text-slate-200" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="text-center space-y-0.5 px-2">
                       <h2 className="text-[11px] sm:text-[14px] font-black text-devo-950 leading-tight group-hover:text-devo-600 transition-colors uppercase tracking-tight">{channel.name}</h2>
                       <p className="text-slate-400 font-bold text-[8px] sm:text-[10px] uppercase tracking-widest">{channel.handle}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 pt-6 lg:pt-0 pb-20 lg:pb-0">
      <aside className="hidden lg:flex w-14 xl:w-20 bg-white border-r border-slate-200 flex-col items-center py-4 xl:py-6 gap-4 xl:gap-6 sticky top-20 h-[calc(100vh-80px)] z-50 shrink-0">
        <button 
          onClick={() => router.push(pathname)}
          title="Back to Global Library"
          className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg active:scale-95 mb-4 group"
        >
          <Grid className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
        <div className="flex flex-col items-center gap-3 xl:gap-5 flex-grow overflow-y-auto w-full custom-scrollbar pb-6 px-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => router.push(`${pathname}?channel=${channel.channel_id}`)}
              title={channel.name}
              className={`relative group p-1.5 rounded-2xl transition-all duration-300 ${
                activeChannel?.id === channel.id
                  ? "ring-2 ring-devo-500 ring-offset-4 bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="w-10 h-10 xl:w-14 xl:h-14 rounded-lg xl:rounded-xl overflow-hidden shadow-md border-2 border-white bg-slate-200 flex items-center justify-center">
                {channel.custom_logo || logoCache[channel.channel_id] ? (
                  <Image
                    src={channel.custom_logo || logoCache[channel.channel_id]}
                    alt={channel.name}
                    width={56}
                    height={56}
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                  />
                ) : (
                  <Video className="w-5 h-5 xl:w-6 xl:h-6 text-slate-400" />
                )}
              </div>
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-devo-950 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                {channel.name}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="lg:hidden relative z-[60] mt-0 bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => router.push(`${pathname}?channel=${channel.channel_id}`)}
              className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all duration-300 ${
                activeChannel?.id === channel.id ? "scale-105" : "opacity-60"
              }`}
            >
               <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 shadow-sm ${
                activeChannel?.id === channel.id ? "border-devo-500 ring-2 ring-devo-100" : "border-white"
              }`}>
                {channel.custom_logo || logoCache[channel.channel_id] ? (
                  <Image
                    src={channel.custom_logo || logoCache[channel.channel_id]}
                    alt={channel.name}
                    width={56}
                    height={56}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <Video className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600 truncate max-w-[60px]">
                {channel.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="h-44 sm:h-64 relative">
          <div
            className="absolute inset-0 opacity-90 transition-all duration-700"
            style={{ background: activeChannel.banner_style }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          <div className="absolute -bottom-16 sm:-bottom-20 left-1/2 sm:left-8 -translate-x-1/2 sm:translate-x-0 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 w-full sm:w-auto px-4 sm:px-0">
            <div className="relative w-28 h-28 sm:w-44 sm:h-44 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-4 sm:border-8 border-white shadow-2xl bg-slate-100 flex items-center justify-center shrink-0">
              {(activeLogo) ? (
                <Image
                  src={activeLogo}
                  alt={activeChannel.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Video className="w-12 h-12 text-slate-300" />
              )}
            </div>
            <div className="pb-3 space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-4xl font-outfit font-black text-devo-950 tracking-tight drop-shadow-sm">
                  {activeChannel.name}
                </h1>
                <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <span className="inline-block text-white bg-black/25 backdrop-blur-md px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border border-white/20">
                {activeChannel.handle}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-24 px-4 sm:px-10 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            {!activePlaylistId ? (
              <div className="flex bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-black uppercase tracking-widest text-[9px] sm:text-[10px]">
              <button
                onClick={() => { setActiveTab("videos"); setActivePlaylistId(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 transition-all ${
                  activeTab === "videos" ? "bg-devo-950 text-white" : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Play className="w-3.5 h-3.5 sm:w-4 h-4" />
                Videos
              </button>
              <button
                onClick={() => { setActiveTab("playlists"); setActivePlaylistId(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 transition-all ${
                  activeTab === "playlists" ? "bg-devo-950 text-white" : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5 sm:w-4 h-4" />
                Playlists
              </button>
            </div>
            ) : (
              <div className="flex items-center justify-between bg-devo-950 p-4 rounded-2xl shadow-lg sticky top-20 z-40">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Layers className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-outfit font-black text-sm truncate uppercase tracking-widest">
                    {activePlaylistName}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setActivePlaylistId(null);
                    setActivePlaylistName(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Back to Channel
                </button>
              </div>
            )}

            <div ref={playerRef} className="scroll-mt-24 aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl relative">
              {activeVideoId ? (
                <OptimizedVideoPlayer 
                  key={activeVideoId}
                  videoId={activeVideoId}
                  title={activeVideo?.title || "Video"}
                  artist={activeChannel?.name || "Devotional Library"}
                  thumbnail={activeVideo?.thumbnail}
                  onStateChange={(state: number) => {
                    if (state === -1) setLoading(true);
                    else setLoading(false);
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 px-6 text-center">
                   <p className="text-white/50 font-bold text-sm uppercase tracking-widest leading-loose">
                    {activeTab === "live" ? "No live streams currently" : "Select a video from the list to start watching"}
                  </p>
                </div>
              )}
            </div>

            {activeVideo && (
              <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div className="space-y-3 flex-1">
                    <h2 className="text-xl sm:text-2xl font-outfit font-black text-devo-950 tracking-tight leading-tight">
                      {activeVideo.title}
                    </h2>
                    <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {activeVideo.date}
                      </span>
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${isLive ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        <Radio className={`w-3.5 h-3.5 ${isLive ? "animate-pulse" : ""}`} />
                        {isLive ? "LIVE" : activeTab.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => openExternal(`https://www.youtube.com/watch?v=${activeVideoId}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#FF0000] text-white rounded-xl hover:bg-[#cc0000] transition-all shadow-md active:scale-95"
                      title="Watch on YouTube"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Watch on YouTube</span>
                    </button>
                    <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                      <Share2 className="w-5 h-5 text-slate-400" />
                    </button>
                    <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                      <Bookmark className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
                <p className="text-slate-400 text-sm font-medium leading-relaxed border-t border-slate-50 pt-4">
                  Distraction-free devotional viewing for Brahmacharis. All content is curated from
                  approved spiritual channels. New videos from <strong>{activeChannel.name}</strong> appear here automatically.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search this channel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:border-devo-500 font-bold text-[11px] sm:text-xs outline-none transition-all shadow-sm"
              />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-2 flex items-center gap-2">
              <Play className="w-3 h-3" />
              {loading ? "Loading…" : `${activePlaylistId ? "Playlist" : activeTab.toUpperCase()}: ${filteredVideos.length} Items`}
            </p>

            <div className="space-y-3 max-h-[1200px] overflow-y-auto pr-1 custom-scrollbar">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-[2rem] border-2 border-transparent animate-pulse">
                    <div className="w-32 sm:w-40 aspect-video rounded-2xl bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2 py-2">
                      <div className="h-3 bg-slate-200 rounded-full w-full" />
                      <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                      <div className="h-2 bg-slate-100 rounded-full w-1/3 mt-4" />
                    </div>
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-red-100">
                  <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                  <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Failed to load</p>
                </div>
              ) : (
                <>
                  {/* Local Results Section */}
                  {filteredVideos.length > 0 && (
                    <div className="space-y-3">
                      {activeChannel && !searchQuery && (
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-2">
                          All Content
                        </p>
                      )}
                      {searchQuery && (
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-devo-600 pl-2">
                          Matches in this Channel
                        </p>
                      )}
                      {filteredVideos.map((vid: VideoItem) => (
                        <button
                          key={vid.id + vid.type}
                          onClick={() => handleVideoSelect(vid)}
                          className={`w-full group flex items-start gap-4 p-4 rounded-[2rem] transition-all duration-300 border-2 text-left ${activeVideoId === vid.id
                              ? "bg-white border-devo-400 shadow-lg"
                              : "bg-white/50 border-transparent hover:bg-white hover:border-slate-200"
                            }`}
                        >
                          <div className="relative w-28 sm:w-40 aspect-video rounded-2xl overflow-hidden shrink-0 shadow-md">
                            <Image src={vid.thumbnail} alt={vid.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized loading="eager" />
                            {vid.type === "playlist" && (
                              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                                <Layers className="w-6 h-6 mb-1" />
                                <span className="text-[10px] font-black uppercase">{vid.playlistCount ?? "?"} Videos</span>
                              </div>
                            )}
                            {activeVideoId === vid.id && (
                              <div className="absolute inset-0 bg-devo-600/30 backdrop-blur-[2px] flex items-center justify-center">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <Radio className="w-4 h-4 text-devo-600 animate-pulse" />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5 py-1 flex-1 min-w-0">
                            <p className={`font-outfit font-black text-[13px] sm:text-sm leading-snug line-clamp-3 ${activeVideoId === vid.id ? "text-devo-700" : "text-slate-700"}`}>
                              {vid.title}
                            </p>
                            {vid.type !== "playlist" && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vid.date}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Divider if both have results */}
                  {searchQuery && filteredVideos.length > 0 && globalResults.length > 0 && (
                    <div className="h-px bg-slate-200 my-6 mx-4" />
                  )}

                  {/* Global Results Section */}
                  {searchQuery && (
                    <div className="space-y-4 pt-2">
                       {(globalResults.length > 0 || isSearchingGlobal) && (
                         <>
                           <div className="flex items-center justify-between px-2">
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-devo-600">
                               Global Spiritual Search
                             </p>
                             {isSearchingGlobal && <Loader2 className="w-3 h-3 animate-spin text-devo-400" />}
                           </div>
                           
                           <div className="space-y-3">
                             {globalResults
                               .filter(gr => gr.channelId !== activeChannel?.channel_id)
                               .slice(0, 10)
                               .map((item: any, i) => (
                               <button
                                 key={item.id + i}
                                 onClick={() => {
                                   const query = new URLSearchParams();
                                   query.set("channel", item.channelId || item.channel_id);
                                   if (item.type === "playlist") query.set("playlist", item.id);
                                   else query.set("v", item.id);
                                   setSearchQuery("");
                                   router.push(`${pathname}?${query.toString()}`);
                                 }}
                                 className="w-full group flex items-start gap-3 p-3 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 text-left"
                               >
                                 <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0 shadow-sm">
                                   <Image src={item.thumbnail} alt={item.title} fill className="object-cover" unoptimized />
                                 </div>
                                 <div className="flex-1 min-w-0 space-y-1">
                                   <p className="font-outfit font-black text-[13px] leading-tight text-slate-700 line-clamp-2 group-hover:text-devo-600 transition-colors">
                                     {item.title}
                                   </p>
                                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                     {item.channelTitle}
                                   </p>
                                 </div>
                               </button>
                             ))}
                           </div>
                         </>
                        )}
                        
                        {!isSearchingGlobal && globalResults.length === 0 && searchQuery.length >= 2 && filteredVideos.length === 0 && (
                          <div className="text-center py-10 bg-white/30 rounded-3xl border-2 border-dashed border-slate-100">
                            <Search className="w-8 h-8 text-slate-200 mx-auto mb-2 opacity-50" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
                              No matches discovered in {activeChannel.name} or the wider library
                            </p>
                          </div>
                        )}
                    </div>
                  )}

                  {nextPageToken && (
                    <button
                      onClick={() => fetchContent(activeChannel, activeTab, true)}
                      disabled={loadMoreLoading}
                      className="w-full py-4 bg-white/50 hover:bg-white text-devo-600 rounded-[2rem] border-2 border-dashed border-devo-100 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {loadMoreLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Load More Archives"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
