-- 1. Create user_favorite_channels table
CREATE TABLE IF NOT EXISTS public.user_favorite_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL REFERENCES public.youtube_channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, channel_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_favorite_channels ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Users can only manage their own favorite channels
DROP POLICY IF EXISTS "Users can manage their own favorite channels" ON public.user_favorite_channels;
CREATE POLICY "Users can manage their own favorite channels" ON public.user_favorite_channels
    FOR ALL USING (auth.uid() = user_id);

-- 4. Set up index for faster lookup
CREATE INDEX IF NOT EXISTS idx_user_favorite_channels_user_id ON public.user_favorite_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_channels_channel_id ON public.user_favorite_channels(channel_id);
