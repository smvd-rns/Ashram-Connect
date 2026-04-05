-- Harinam Manual Attendance Table (Updated to use integers for all session durations)
-- Records manual attendance marking for Harinam sessions

CREATE TABLE IF NOT EXISTS public.harinam_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email TEXT NOT NULL REFERENCES public.profiles(email),
    date DATE NOT NULL,
    h7am INTEGER DEFAULT 0,     -- 7:00 AM session (integer minutes, 0 or 30)
    h740am INTEGER DEFAULT 0,   -- 7:40 AM session (integer minutes, 0 or 30)
    hpdc INTEGER DEFAULT 0,     -- PDC session (integer minutes, 0 or 90)
    hcustom_mins INTEGER DEFAULT 0, -- Custom manual minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, date)
);

-- Migration for existing tables:
-- If your table was created with BOOLEAN columns, run these:
-- ALTER TABLE public.harinam_attendance ALTER COLUMN h7am TYPE INTEGER USING (CASE WHEN h7am THEN 30 ELSE 0 END);
-- ALTER TABLE public.harinam_attendance ALTER COLUMN h740am TYPE INTEGER USING (CASE WHEN h740am THEN 30 ELSE 0 END);
-- ALTER TABLE public.harinam_attendance ALTER COLUMN hpdc TYPE INTEGER USING (CASE WHEN hpdc THEN 90 ELSE 0 END);

-- Index for fast lookup by email and date
CREATE INDEX IF NOT EXISTS idx_harinam_email_date ON public.harinam_attendance(user_email, date);

-- Enable RLS
ALTER TABLE public.harinam_attendance ENABLE ROW LEVEL SECURITY;

-- Policies: Only Admins can modify, all authenticated can view? 
-- Let's make it Admins-only for now consistent with other attendance tables.

DROP POLICY IF EXISTS "Admins can view harinam" ON public.harinam_attendance;
CREATE POLICY "Admins can view harinam" 
ON public.harinam_attendance FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);

DROP POLICY IF EXISTS "Admins can control harinam" ON public.harinam_attendance;
CREATE POLICY "Admins can control harinam" 
ON public.harinam_attendance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);

-- Trigger for update timestamp
DROP TRIGGER IF EXISTS trigger_update_harinam_timestamp ON public.harinam_attendance;
CREATE OR REPLACE FUNCTION update_harinam_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_harinam_timestamp
BEFORE UPDATE ON public.harinam_attendance
FOR EACH ROW
EXECUTE FUNCTION update_harinam_timestamp();
