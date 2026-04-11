-- Create table for storing sent notifications history
CREATE TABLE IF NOT EXISTS public.notifications_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT DEFAULT '/',
    icon TEXT DEFAULT '/favicon.ico',
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view history
DROP POLICY IF EXISTS "Public view notifications" ON public.notifications_history;
CREATE POLICY "Public view notifications"
    ON public.notifications_history FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only Managers and Admins can insert
DROP POLICY IF EXISTS "Managers can insert history" ON public.notifications_history;
CREATE POLICY "Managers can insert history"
    ON public.notifications_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 1 OR role = 5)
        )
    );

-- Index for faster listing
CREATE INDEX IF NOT EXISTS notifications_history_created_at_idx ON public.notifications_history(created_at DESC);

-- Enable Realtime for this table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications_history'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications_history;
    END IF;
END $$;
