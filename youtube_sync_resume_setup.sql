-- Persistent cursor support for large YouTube backfills.
-- Run this once in Supabase SQL editor.

ALTER TABLE youtube_channels
ADD COLUMN IF NOT EXISTS sync_cursor TEXT;

CREATE INDEX IF NOT EXISTS idx_youtube_channels_sync_cursor
ON youtube_channels (sync_cursor)
WHERE sync_cursor IS NOT NULL;
