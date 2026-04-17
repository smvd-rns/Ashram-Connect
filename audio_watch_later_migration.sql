-- Create user_audio_favorites table for ISKCON Desire Tree audio
CREATE TABLE IF NOT EXISTS public.user_audio_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    audio_id UUID NOT NULL, -- ID from IDKT Supabase project
    last_position FLOAT DEFAULT 0,
    duration FLOAT DEFAULT 0,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, audio_id)
);

-- Enable RLS
ALTER TABLE public.user_audio_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own audio favorites
DROP POLICY IF EXISTS "Users can manage their own audio favorites" ON public.user_audio_favorites;
CREATE POLICY "Users can manage their own audio favorites" ON public.user_audio_favorites
    FOR ALL USING (auth.uid() = user_id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_user_audio_favorites_user_id ON public.user_audio_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_favorites_audio_id ON public.user_audio_favorites(audio_id);
