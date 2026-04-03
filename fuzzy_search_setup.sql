-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Create Trigram GIN indexes for fuzzy matching on titles and descriptions
-- These are much faster for ILIKE '%query%' and similarity() than standard B-tree or FTS for "fuzzy" purposes across 52K+ rows.
CREATE INDEX IF NOT EXISTS idx_yt_videos_title_trgm ON yt_videos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_videos_desc_trgm ON yt_videos USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_playlists_title_trgm ON yt_playlists USING GIN (title gin_trgm_ops);

-- 2. Create the unified fuzzy search function (RPC)
-- This performs a ranked, combined search across videos and playlists in one efficient database operation.
CREATE OR REPLACE FUNCTION search_youtube_content(
    query_text TEXT,
    channel_id_filter TEXT DEFAULT NULL,
    max_limit INT DEFAULT 50
)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    thumbnail TEXT,
    published TIMESTAMPTZ,
    type TEXT,
    playlist_count INT,
    channel_title TEXT,
    channel_id TEXT,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    WITH combined_results AS (
        -- Search in Videos
        SELECT 
            v.video_id AS id,
            v.title,
            v.thumbnail_url AS thumbnail,
            v.published_at AS published,
            'video' AS type,
            NULL::INT AS playlist_count,
            c.title AS channel_title,
            v.channel_id,
            similarity(v.title, query_text) AS search_rank
        FROM yt_videos v
        JOIN youtube_channels c ON v.channel_id = c.channel_id
        WHERE 
            (channel_id_filter IS NULL OR v.channel_id = channel_id_filter)
            AND (v.title % query_text OR v.description % query_text OR v.title ILIKE '%' || query_text || '%')
        
        UNION ALL
        
        -- Search in Playlists
        SELECT 
            p.playlist_id AS id,
            p.title,
            p.thumbnail_url AS thumbnail,
            p.created_at AS published,
            'playlist' AS type,
            p.video_count AS playlist_count,
            c.title AS channel_title,
            p.channel_id,
            similarity(p.title, query_text) AS search_rank
        FROM yt_playlists p
        JOIN youtube_channels c ON p.channel_id = c.channel_id
        WHERE 
            (channel_id_filter IS NULL OR p.channel_id = channel_id_filter)
            AND (p.title % query_text OR p.title ILIKE '%' || query_text || '%')
    )
    SELECT * FROM combined_results
    ORDER BY search_rank DESC, published DESC
    LIMIT max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
