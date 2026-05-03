const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Paths
const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');

// Old (Main) DB
const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const oldSupabase = createClient(oldUrl, oldKey);

// New (YouTube) DB
const newUrl = process.env.NEXT_PUBLIC_SUPABASE_YT_URL;
const newKey = process.env.SUPABASE_YT_SERVICE_ROLE_KEY;
const newSupabase = createClient(newUrl, newKey);

function saveProgress(data) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
    return { lastVideoId: '', lastPlaylistId: '', videosDone: 0 };
}

async function withRetry(fn, label = "Operation", maxRetries = 10) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ ${label} failed: ${err.message || err}. (Attempt ${i + 1}/${maxRetries}). Retrying in 10s...`);
            await new Promise(r => setTimeout(r, 10000));
        }
    }
    throw lastError;
}

async function migrate() {
    console.log("🚀 Starting YouTube Data Migration with PERSISTENT MEMORY...");
    
    let progress = loadProgress();
    console.log(`memo 🧠 Resuming from: ${progress.lastVideoId || 'Start'} (${progress.videosDone} already moved)`);

    // 0. Migrate youtube_channels (Metadata only)
    console.log("📦 Fetching channel metadata...");
    const channels = await withRetry(async () => {
        const { data, error } = await oldSupabase.from('youtube_channels').select('channel_id, name, visibility');
        if (error) throw error;
        return data;
    }, "Fetch Channels");
    
    console.log(`✅ Found ${channels.length} channels.`);

    if (channels.length > 0) {
        console.log("📤 Uploading channel metadata...");
        await withRetry(async () => {
            const { error } = await newSupabase.from('youtube_channels').upsert(channels, { onConflict: 'channel_id' });
            if (error) throw error;
        }, "Upload Channels");
        console.log("✅ Channel metadata synced.");
    }

    // 1. Migrate yt_videos
    console.log("📦 Migrating videos...");
    let hasMoreVideos = true;

    while (hasMoreVideos) {
        console.log(`🔍 Fetching batch after ID: ${progress.lastVideoId || 'BEGINNING'}...`);
        
        const videos = await withRetry(async () => {
            let query = oldSupabase.from('yt_videos').select('*').order('video_id').limit(500);
            if (progress.lastVideoId) query = query.gt('video_id', progress.lastVideoId);
            const { data, error } = await query;
            if (error) throw error;
            return data;
        }, "Fetch Video Batch");

        if (!videos || videos.length === 0) {
            console.log("🏁 No more videos to fetch.");
            hasMoreVideos = false;
            break;
        }

        console.log(`📤 Uploading ${videos.length} videos...`);
        await withRetry(async () => {
            const { error } = await newSupabase.from('yt_videos').upsert(videos, { onConflict: 'video_id' });
            if (error) throw error;
        }, "Upload Video Batch");

        progress.videosDone += videos.length;
        progress.lastVideoId = videos[videos.length - 1].video_id;
        saveProgress(progress);
        
        console.log(`✅ Progress: ${progress.videosDone} total videos moved.`);

        if (videos.length < 500) {
            hasMoreVideos = false;
        } else {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // 2. Migrate yt_playlists
    console.log("📦 Migrating playlists...");
    let hasMorePlaylists = true;

    while (hasMorePlaylists) {
        const playlists = await withRetry(async () => {
            let query = oldSupabase.from('yt_playlists').select('*').order('playlist_id').limit(200);
            if (progress.lastPlaylistId) query = query.gt('playlist_id', progress.lastPlaylistId);
            const { data, error } = await query;
            if (error) throw error;
            return data;
        }, "Fetch Playlist Batch");

        if (!playlists || playlists.length === 0) {
            hasMorePlaylists = false;
            break;
        }

        await withRetry(async () => {
            const { error } = await newSupabase.from('yt_playlists').upsert(playlists, { onConflict: 'playlist_id' });
            if (error) throw error;
        }, "Upload Playlist Batch");

        progress.lastPlaylistId = playlists[playlists.length - 1].playlist_id;
        saveProgress(progress);
        console.log(`✅ Playlists migrated up to: ${progress.lastPlaylistId}`);

        if (playlists.length < 200) {
            hasMorePlaylists = false;
        }
    }

    console.log(`🎉 ALL DONE! Total videos moved: ${progress.videosDone}`);
    // Optional: Delete progress file on success
    // fs.unlinkSync(PROGRESS_FILE);
}

migrate().catch(err => {
    console.error("\n❌ FATAL ERROR:", err.message || err);
    console.log("💡 Tip: Just run the script again to resume from where it failed.");
});
