-- Migration: Enable Unique Daily User Visit Tracking (with Cleanup)
-- Run this in the Supabase SQL Editor

-- 1. Ensure visit_date exists first
ALTER TABLE public.user_visits 
ADD COLUMN IF NOT EXISTS visit_date DATE DEFAULT (CURRENT_DATE AT TIME ZONE 'UTC');

-- 2. Backfill visit_date for any existing rows
UPDATE public.user_visits 
SET visit_date = visited_at::DATE 
WHERE visit_date IS NULL;

-- 3. CLEANUP: Delete duplicate visits for the same user on the same day
-- This keeps only the earliest visit (lowest ID) for each day
DELETE FROM public.user_visits a
USING public.user_visits b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.visit_date = b.visit_date;

-- 4. Add the Unique Constraint (Will now succeed since duplicates are gone)
ALTER TABLE public.user_visits 
DROP CONSTRAINT IF EXISTS unique_user_daily_visit;

ALTER TABLE public.user_visits 
ADD CONSTRAINT unique_user_daily_visit UNIQUE (user_id, visit_date);

-- 5. Recommended Index for analytics speed
CREATE INDEX IF NOT EXISTS user_visits_composite_idx ON public.user_visits (visit_date, user_id);
