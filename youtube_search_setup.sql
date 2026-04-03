-- 1. Update youtube_channels table with sync metadata
ALTER TABLE youtube_channels 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_error TEXT;

-- Add a constraint to ensure valid sync statuses
ALTER TABLE youtube_channels
DROP CONSTRAINT IF EXISTS youtube_channels_sync_status_check;

ALTER TABLE youtube_channels
ADD CONSTRAINT youtube_channels_sync_status_check 
CHECK (sync_status IN ('idle', 'syncing', 'completed', 'error'));

-- 2. Create yt_videos table for indexed video search
CREATE TABLE IF NOT EXISTS yt_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT UNIQUE NOT NULL,
    channel_id TEXT NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMPTZ,
    kind TEXT DEFAULT 'video',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_yt_videos_title_search ON yt_videos USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_yt_videos_channel_id ON yt_videos(channel_id);

-- 3. Create yt_playlists table for indexed playlist search
CREATE TABLE IF NOT EXISTS yt_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id TEXT UNIQUE NOT NULL,
    channel_id TEXT NOT NULL REFERENCES youtube_channels(channel_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    video_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yt_playlists_channel_id ON yt_playlists(channel_id);

-- 4. Enable RLS (Assuming you want these public readable but admin writable)
ALTER TABLE yt_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE yt_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access for yt_videos" ON yt_videos;
CREATE POLICY "Public Read Access for yt_videos" ON yt_videos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Access for yt_playlists" ON yt_playlists;
CREATE POLICY "Public Read Access for yt_playlists" ON yt_playlists
    FOR SELECT USING (true);
