-- Migration: Backfill User Visits from Profile Data
-- Run this in the Supabase SQL Editor to populate the new analytics table

-- 1. Populate the user_visits table using the "last_visit_at" from your profiles
-- This ensures that everyone who visited recently is immediately visible in the dashboard
INSERT INTO public.user_visits (user_id, visited_at, visit_date)
SELECT id, last_visit_at, (last_visit_at AT TIME ZONE 'UTC')::DATE
FROM public.profiles
WHERE last_visit_at IS NOT NULL
ON CONFLICT (user_id, visit_date) DO NOTHING;

-- 2. Verify: This query should now show you how many records were backfilled
SELECT COUNT(*) as records_found FROM public.user_visits;
