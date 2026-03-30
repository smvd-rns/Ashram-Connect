-- Paste this into your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS public.lectures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    speaker_name TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access"
ON public.lectures
FOR SELECT
USING (true);

-- Note: We will use the service_role key to insert new records from the backend API,
-- which bypasses RLS. If you prefer to allow authenticated users to insert directly
-- from the client, you would add an INSERT policy here.
