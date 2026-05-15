-- =========================================================
-- SUPABASE DISK I/O OPTIMIZATION MIGRATION
-- Run this in your Supabase SQL Editor
-- =========================================================

-- ---------------------------------------------------------
-- 1. MISSING DATE-RANGE INDEXES FOR ATTENDANCE REPORTS
-- (Fixes heavy Sequential Scans on large attendance tables)
-- ---------------------------------------------------------

-- Optimize 'harinam_attendance' for date-range report queries
CREATE INDEX IF NOT EXISTS idx_harinam_attendance_date_only 
  ON public.harinam_attendance (date);

-- Optimize 'virtual_machine_attendance' for virtual machine reports
CREATE INDEX IF NOT EXISTS idx_virtual_machine_attendance_machine_date 
  ON public.virtual_machine_attendance (machine_id, date);

-- Optimize 'attendance_exceptions' for date-range searches
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_date_only 
  ON public.attendance_exceptions (date);

-- ---------------------------------------------------------
-- 2. ANALYTICS PRE-AGGREGATION VIEW
-- (Eliminates reading 50,000+ raw rows into Next.js memory)
-- ---------------------------------------------------------

-- Create the daily aggregation view
CREATE OR REPLACE VIEW public.analytics_daily_visits AS
SELECT 
  visit_date, 
  COUNT(*)::int as count
FROM 
  public.user_visits
GROUP BY 
  visit_date;

-- Allow the service role / authenticated role to read the view
ALTER VIEW public.analytics_daily_visits OWNER TO postgres;

-- ---------------------------------------------------------
-- 3. VACUUM AND ANALYZE
-- (Reclaims disk space and updates statistics for the planner)
-- ---------------------------------------------------------
ANALYZE public.harinam_attendance;
ANALYZE public.virtual_machine_attendance;
ANALYZE public.attendance_exceptions;
ANALYZE public.user_visits;
ANALYZE public.physical_attendance;
