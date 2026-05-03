-- 1. Enable pg_trgm for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create simplified youtube_channels table for cross-db joins
CREATE TABLE IF NOT EXISTS youtube_channels (
    channel_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    visibility TEXT DEFAULT 'public'
);

-- 3. Create yt_videos table
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

CREATE INDEX IF NOT EXISTS idx_yt_videos_title_trgm ON yt_videos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_videos_channel_id ON yt_videos(channel_id);

-- 4. Create yt_playlists table
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

CREATE INDEX IF NOT EXISTS idx_yt_playlists_title_trgm ON yt_playlists USING GIN (title gin_trgm_ops);

-- 5. Enable RLS
ALTER TABLE yt_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE yt_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access for yt_videos" ON yt_videos FOR SELECT USING (true);
CREATE POLICY "Public Read Access for yt_playlists" ON yt_playlists FOR SELECT USING (true);
CREATE POLICY "Public Read Access for youtube_channels" ON youtube_channels FOR SELECT USING (true);

-- 6. Create robust Search RPC
CREATE OR REPLACE FUNCTION search_youtube_content(
    query_text TEXT,
    channel_ids TEXT[] DEFAULT NULL,
    max_limit INTEGER DEFAULT 200,
    requesting_user_id UUID DEFAULT NULL -- Kept for compatibility but filtering happens via visibility column
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    thumbnail TEXT,
    published TIMESTAMPTZ,
    type TEXT,
    playlist_count INTEGER,
    channel_id TEXT,
    channel_title TEXT,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH combined_results AS (
        SELECT 
            v.video_id AS id, v.title, v.thumbnail_url AS thumbnail, v.published_at AS published,
            'video' AS type, 0 AS playlist_count, v.channel_id, c.name AS channel_title,
            word_similarity(query_text, v.title) AS search_rank
        FROM yt_videos v
        JOIN youtube_channels c ON v.channel_id = c.channel_id
        WHERE 
            (v.title ILIKE '%' || query_text || '%' OR v.title % query_text)
            AND (
                -- If authorized IDs are provided, use them (this allows private search)
                (channel_ids IS NOT NULL AND v.channel_id = ANY(channel_ids))
                OR
                -- Fallback for guest search (public only)
                (channel_ids IS NULL AND c.visibility = 'public')
            )
        
        UNION ALL
        
        SELECT 
            p.playlist_id AS id, p.title, p.thumbnail_url AS thumbnail, p.created_at AS published,
            'playlist' AS type, p.video_count AS playlist_count, p.channel_id, c.name AS channel_title,
            word_similarity(query_text, p.title) AS search_rank
        FROM yt_playlists p
        JOIN youtube_channels c ON p.channel_id = c.channel_id
        WHERE 
            (p.title ILIKE '%' || query_text || '%' OR p.title % query_text)
            AND (
                (channel_ids IS NOT NULL AND p.channel_id = ANY(channel_ids))
                OR
                (channel_ids IS NULL AND c.visibility = 'public')
            )
    )
    SELECT * FROM combined_results
    ORDER BY search_rank DESC, published DESC
    LIMIT max_limit;
END;
$$ LANGUAGE plpgsql;
