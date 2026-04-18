-- Migration: Add visibility to youtube_channels and create assignments table
ALTER TABLE youtube_channels ADD COLUMN visibility TEXT DEFAULT 'public'; -- 'public' or 'private'

CREATE TABLE youtube_channel_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);
