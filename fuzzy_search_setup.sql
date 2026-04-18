-- 1. Enable pg_trgm if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Update the Search Function to support PRIVACY and MULTI-CHANNEL filtering
CREATE OR REPLACE FUNCTION search_youtube_content(
    query_text TEXT,
    channel_ids TEXT[] DEFAULT NULL,
    max_limit INT DEFAULT 200,
    requesting_user_id UUID DEFAULT NULL -- Added for privacy filtering
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
            c.name AS channel_title,
            v.channel_id,
            word_similarity(query_text, v.title) AS search_rank
        FROM yt_videos v
        JOIN youtube_channels c ON v.channel_id = c.channel_id
        WHERE 
            (channel_ids IS NULL OR v.channel_id = ANY(channel_ids))
            AND (
                v.title ILIKE '%' || query_text || '%' 
                OR v.title % query_text
            )
            -- Privacy Enforcement
            AND (
                c.visibility = 'public'
                OR (requesting_user_id IS NOT NULL AND (
                    EXISTS (SELECT 1 FROM youtube_channel_assignments a WHERE a.channel_id = c.id AND a.user_id = requesting_user_id)
                    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = requesting_user_id AND (p.role = 1 OR (p.roles IS NOT NULL AND 1 = ANY(p.roles))))
                ))
            )
        
        UNION ALL
        
        -- Search in Playlists
        SELECT 
            p.playlist_id AS id,
            p.title,
            p.thumbnail_url AS thumbnail,
            p.created_at AS published,
            'playlist' AS type,
            p.video_count AS playlist_count,
            c.name AS channel_title,
            p.channel_id,
            word_similarity(query_text, p.title) AS search_rank
        FROM yt_playlists p
        JOIN youtube_channels c ON p.channel_id = c.channel_id
        WHERE 
            (channel_ids IS NULL OR p.channel_id = ANY(channel_ids))
            AND (
                p.title ILIKE '%' || query_text || '%'
                OR p.title % query_text
            )
            -- Privacy Enforcement
            AND (
                c.visibility = 'public'
                OR (requesting_user_id IS NOT NULL AND (
                    EXISTS (SELECT 1 FROM youtube_channel_assignments a WHERE a.channel_id = c.id AND a.user_id = requesting_user_id)
                    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = requesting_user_id AND (p.role = 1 OR (p.roles IS NOT NULL AND 1 = ANY(p.roles))))
                ))
            )
    )
    SELECT * FROM combined_results
    ORDER BY search_rank DESC, published DESC
    LIMIT max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure GIN Trigram indexes are active for maximum speed
CREATE INDEX IF NOT EXISTS idx_yt_videos_title_trgm ON yt_videos USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_yt_playlists_title_trgm ON yt_playlists USING GIN (title gin_trgm_ops);
