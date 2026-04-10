-- Create table for storing push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    subscription_key TEXT NOT NULL, -- Unique identifier (endpoint or token)
    provider TEXT DEFAULT 'web-push', -- 'web-push' or 'fcm'
    device_type TEXT, -- 'mobile', 'desktop', etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subscription_key)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.push_subscriptions;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON public.push_subscriptions(user_id);

-- Add real-time support (Safe check to avoid errors if already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'push_subscriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
    END IF;
END $$;
