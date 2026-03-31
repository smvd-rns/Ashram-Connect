-- Fix for Usage Analytics: RLS and Timezone Normalization
-- Run this in Supabase SQL Editor

-- 1. Align the default visit_date to India Standard Time (IST)
ALTER TABLE public.user_visits 
ALTER COLUMN visit_date SET DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata');

-- 2. Ensure RLS is active
ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow users to record their own daily visits (Insert/Update)
DROP POLICY IF EXISTS "Users can log their own daily visits" ON public.user_visits;
CREATE POLICY "Users can log their own daily visits" 
ON public.user_visits FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Policy: Allow Admins to see all visit data for reporting
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.user_visits;
CREATE POLICY "Admins can view all analytics" 
ON public.user_visits FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);

-- 5. Cleanup any stray UTC-based future visits if needed
-- (Sometimes visits from "tomorrow" UTC appear early if server time is leading)
DELETE FROM public.user_visits WHERE visit_date > (CURRENT_DATE AT TIME ZONE 'Asia/Kolkata');
