-- Migration: Add missing columns to push_subscriptions
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'web-push',
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Update existing rows to have a default provider if it was null
UPDATE public.push_subscriptions SET provider = 'web-push' WHERE provider IS NULL;
