-- Migration: Add visibility to youtube_channels and create assignments table
ALTER TABLE youtube_channels ADD COLUMN visibility TEXT DEFAULT 'public'; -- 'public' or 'private'

CREATE TABLE IF NOT EXISTS public.youtube_channel_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.youtube_channel_assignments ENABLE ROW LEVEL SECURITY;

-- Grant access per role
GRANT SELECT ON public.youtube_channel_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channel_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channel_assignments TO service_role;

-- Policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.youtube_channel_assignments;
CREATE POLICY "Admins can manage assignments" ON public.youtube_channel_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 1));

DROP POLICY IF EXISTS "Users can view own assignments" ON public.youtube_channel_assignments;
CREATE POLICY "Users can view own assignments" ON public.youtube_channel_assignments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
