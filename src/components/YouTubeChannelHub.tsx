"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Search, Play, Radio, Film, Layers, ExternalLink,
  Loader2, X, Clock, CheckCircle2,
  Heart, Bookmark, Share2, Video, AlertCircle
} from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  published: string;
  type: "video" | "live" | "short" | "playlist";
  playlistCount?: number;
}

interface Channel {
  id: string;          // Database UUID
  channel_id: string;   // UCxx format
  name: string;
  handle: string;
  custom_logo: string;  // Manually uploaded to Supabase
  banner_style: string;
}

// The list of channels is now fetched dynamically from the database
// via GET /api/youtube/channels

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

  // Cache: { [channelId]: { [tabId]: { [playlistId]: { items: [], token: "" } } } }
  const [contentCache, setContentCache] = useState<Record<string, any>>({});
  const [logoCache, setLogoCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track which channel-tab combinations have been initiated
  const fetchedRef = useRef<Set<string>>(new Set());

  // Fetch initial channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch("/api/youtube/channels");
        const data = await res.json();
        if (data.channels?.length > 0) {
          setChannels(data.channels);
          setActiveChannel(data.channels[0]);
        }
      } catch (err) {
        setError("Failed to load portal configuration.");
      }
    };
    fetchChannels();
  }, []);

  const currentTabContent = activeChannel 
    ? (contentCache[activeChannel.channel_id]?.[activeTab]?.[activePlaylistId || "main"] || { items: [], token: "" })
    : { items: [], token: "" };
    
  const videos = currentTabContent.items;
  const nextPageToken = currentTabContent.token;
  
  // LOGO PRIORITY: 1. Manual Upload (DB) > 2. Live YouTube Logo (Cache) > 3. Placeholder
  const activeLogo = activeChannel?.custom_logo || (activeChannel ? logoCache[activeChannel.channel_id] : null);

  const fetchContent = useCallback(async (channel: Channel, tab: string, isLoadMore = false) => {
    if (!channel) return;
    const pId = activePlaylistId || "main";
    const cacheKey = `${channel.channel_id}-${tab}-${pId}`;
    
    // Bypassing cache if it's already empty/zero (to allow recovery from failed loads)
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
      
      // Use a timestamp to prevent browser caching if it's an intentional refresh
      const tParam = `&_t=${Date.now()}`;
      const res = await fetch(`/api/youtube?channelId=${channel.channel_id}&type=${tab}&pageToken=${pageToken}${plParam}${tParam}`);
      const data = await res.json();
      
      if (!res.ok) {
        // If it failed, don't mark as permanently fetched
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
  }, [nextPageToken, activePlaylistId, contentCache]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on channel, tab, or playlist change
  useEffect(() => {
    if (activeChannel) fetchContent(activeChannel, activeTab);
  }, [activeChannel, activeTab, activePlaylistId]); // eslint-disable-line react-hooks/exhaustive-deps

  const playerRef = useRef<HTMLDivElement>(null);

  // Auto-select first video once initial videos load for a NEW channel/playlist
  useEffect(() => {
    const isShowingPlaylist = activePlaylistId !== null;
    const isMainVideoTab = activeTab === "videos" && !isShowingPlaylist;

    if (!activeVideoId && videos.length > 0 && (isMainVideoTab || isShowingPlaylist)) {
      setActiveVideoId(videos[0].id);
      setIsLive(videos[0].type === "live");
    }
  }, [videos, activeVideoId, activeTab, activePlaylistId]);

  const filteredVideos = videos.filter((v: VideoItem) =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeVideo = videos.find((v: VideoItem) => v.id === activeVideoId);

  const handleVideoSelect = (vid: VideoItem) => {
    if (vid.type === "playlist") {
      setActivePlaylistId(vid.id);
      setActivePlaylistName(vid.title);
      setActiveVideoId(null);
      return;
    }
    setActiveVideoId(vid.id);
    setIsLive(vid.type === "live");
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getEmbedUrl = () =>
    `https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`;

  if (!activeChannel) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-devo-600" /></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 pt-6 lg:pt-0 pb-20 lg:pb-0">
      {/* ─── DESKTOP SIDEBAR (lg+) ─────────────────────────────────── */}
      <aside className="hidden lg:flex w-24 bg-white border-r border-slate-200 flex-col items-center py-8 gap-8 sticky top-20 h-[calc(100vh-80px)] z-50 shrink-0">
        <div className="p-2.5 bg-devo-600 rounded-2xl text-white shadow-lg mb-4">
          <Video className="w-8 h-8" />
        </div>

        <div className="flex flex-col items-center gap-6 flex-grow overflow-y-auto w-full custom-scrollbar pb-8">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel); setActivePlaylistId(null); setActiveVideoId(null); }}
              title={channel.name}
              className={`relative group p-1.5 rounded-2xl transition-all duration-300 ${
                activeChannel?.id === channel.id
                  ? "ring-2 ring-devo-500 ring-offset-4 bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden shadow-md border-2 border-white bg-slate-200 flex items-center justify-center">
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
                  <Video className="w-6 h-6 text-slate-400" />
                )}
              </div>
              {/* Tooltip */}
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-devo-950 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                {channel.name}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto p-4 opacity-20">
          <Heart className="w-6 h-6 text-slate-400" />
        </div>
      </aside>

      {/* ─── MOBILE/TABLET CHANNEL TRAY (<lg) ─────────────────────────── */}
      <div className="lg:hidden sticky top-16 z-[60] mt-0 bg-white border-b border-slate-200 px-4 py-4 shadow-sm">
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel); setActivePlaylistId(null); setActiveVideoId(null); }}
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

      {/* ─── MAIN CONTENT ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">

        {/* Banner with Logo Priority */}
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

        {/* Content grid */}
        <div className="pt-24 px-4 sm:px-10 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left: Player + Info ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Tab bar */}
            {!activePlaylistId ? (
              <nav className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm sticky top-20 z-40 backdrop-blur-md bg-white/90">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id
                        ? "bg-devo-950 text-white shadow-lg"
                        : "text-slate-400 hover:text-devo-600 hover:bg-slate-50"
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
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

            {/* Player */}
            <div ref={playerRef} className="scroll-mt-24 aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl relative">
              {loading && !activeVideoId ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-devo-500 animate-spin mx-auto" />
                    <p className="text-white font-bold text-sm uppercase tracking-widest">Loading {activeTab}…</p>
                  </div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-white font-bold text-sm mb-6">{error}</p>
                  <button
                    onClick={() => {
                      const cacheKey = `${activeChannel.channel_id}-${activeTab}`;
                      fetchedRef.current.delete(cacheKey);
                      fetchContent(activeChannel, activeTab);
                    }}
                    className="px-6 py-3 bg-devo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-devo-700 transition-all"
                  >
                    Retry Connection
                  </button>
                  <div className="mt-6 px-6 py-3 bg-red-950/50 border border-red-900/50 rounded-2xl flex items-center gap-3 max-w-md">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-[10px] font-bold text-red-200 leading-tight">
                      Seeing "Unusual Traffic"? This is a YouTube security block for your network. Try refreshing or clearing browser cache.
                    </p>
                  </div>
                </div>
              ) : activeVideoId ? (
                <iframe
                  key={activeVideoId}
                  src={getEmbedUrl()}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <p className="text-white/50 font-bold text-sm uppercase tracking-widest">
                    {activeTab === "live" ? "No live streams currently" : "Select a video to play"}
                  </p>
                </div>
              )}
            </div>

            {/* Video info card */}
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

          {/* ── Right: Video List ── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="text"
                placeholder="Search this channel…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-devo-500 shadow-sm outline-none font-bold text-sm"
              />
            </div>

            {/* List label */}
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pl-2 flex items-center gap-2">
              <Play className="w-3 h-3" />
              {loading ? "Loading…" : `${activePlaylistId ? "Playlist" : activeTab.toUpperCase()}: ${filteredVideos.length} Items`}
            </p>

            {/* Video list */}
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
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                  <X className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    {activePlaylistId ? "No videos found in this playlist" : `No ${activeTab} found`}
                  </p>
                </div>
              ) : (
                <>
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
                        <p className={`font-outfit font-black text-[11px] sm:text-xs leading-snug line-clamp-3 ${activeVideoId === vid.id ? "text-devo-700" : "text-slate-700"}`}>
                          {vid.title}
                        </p>
                        {vid.type !== "playlist" && <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{vid.date}</p>}
                      </div>
                    </button>
                  ))}

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
