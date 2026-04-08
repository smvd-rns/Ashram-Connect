-- Attendance Exceptions Table
-- Stores reasons for missing sessions (Sick, Seva, etc.)

CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL,
    date DATE NOT NULL,
    reason_type TEXT CHECK (reason_type IN ('Sick', 'Seva', 'Out of Station', 'In Center', 'Forgot', 'Late Night Seva', 'Other')),
    comment TEXT,
    applied_sessions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by User Email and Date
CREATE INDEX IF NOT EXISTS attendance_exceptions_user_date_idx ON public.attendance_exceptions (user_email, date);

-- Enable RLS
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies: 
-- 1. Users can view their own exceptions
-- 2. Users can create/update their own exceptions
-- 3. Admins can view and manage all exceptions

DROP POLICY IF EXISTS "Users can view own exceptions" ON public.attendance_exceptions;
CREATE POLICY "Users can view own exceptions"
ON public.attendance_exceptions FOR SELECT
USING (auth.jwt() ->> 'email' = user_email);

DROP POLICY IF EXISTS "Users can manage own exceptions" ON public.attendance_exceptions;
CREATE POLICY "Users can manage own exceptions"
ON public.attendance_exceptions FOR INSERT
WITH CHECK (auth.jwt() ->> 'email' = user_email);

DROP POLICY IF EXISTS "Admins can view all exceptions" ON public.attendance_exceptions;
CREATE POLICY "Admins can view all exceptions"
ON public.attendance_exceptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);
