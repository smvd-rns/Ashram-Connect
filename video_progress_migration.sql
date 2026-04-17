-- Add last_position and duration columns to user_favorites
ALTER TABLE public.user_favorites 
ADD COLUMN IF NOT EXISTS last_position FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_watched_at TIMESTAMPTZ DEFAULT NOW();

-- Update the table description (optional but good practice)
COMMENT ON COLUMN public.user_favorites.last_position IS 'Last playback position in seconds';
COMMENT ON COLUMN public.user_favorites.duration IS 'Total duration of the video in seconds';
