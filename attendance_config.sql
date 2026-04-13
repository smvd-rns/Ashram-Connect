-- BCDB Attendance Configuration
-- [SAFE VERSION] This script is non-destructive and will NOT delete existing machines or data.

-- 1. Ensure Attendance Machines Table exists
CREATE TABLE IF NOT EXISTS public.attendance_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_virtual BOOLEAN DEFAULT false,
    
    -- Machine Time: When to accept logs from the device (Ingestion Window)
    ingestion_start TIME DEFAULT '02:00:00',
    ingestion_end TIME DEFAULT '10:00:00',
    
    -- Attendance Time: Rule for status calculation (P/L/A)
    p_start TIME DEFAULT '04:00:00', -- Present Start
    p_end TIME DEFAULT '04:15:00',   -- Present End
    l_start TIME DEFAULT '04:15:00', -- Late Start
    l_end TIME DEFAULT '05:30:00',   -- Late End
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure Global Settings table exists
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    sync_from_date DATE DEFAULT CURRENT_DATE,
    prasadam_start_time TIME DEFAULT '02:00:00',
    prasadam_end_time TIME DEFAULT '07:30:00',
    prasadam_machine_ids UUID[] DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. [NEW] Aggregate Table for Prasadam Daily Counts
CREATE TABLE IF NOT EXISTS public.prasadam_daily_counts (
    day DATE PRIMARY KEY,
    total_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed global settings if not present
INSERT INTO public.attendance_settings (id, sync_from_date)
VALUES ('global', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- 5. Safe Column Updates (in case they were missed)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_settings' AND column_name='prasadam_start_time') THEN
        ALTER TABLE attendance_settings ADD COLUMN prasadam_start_time TIME DEFAULT '02:00:00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_settings' AND column_name='prasadam_end_time') THEN
        ALTER TABLE attendance_settings ADD COLUMN prasadam_end_time TIME DEFAULT '07:30:00';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_settings' AND column_name='prasadam_machine_ids') THEN
        ALTER TABLE attendance_settings ADD COLUMN prasadam_machine_ids UUID[] DEFAULT '{}';
    END IF;
END $$;

-- 6. Enable RLS
ALTER TABLE public.attendance_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prasadam_daily_counts ENABLE ROW LEVEL SECURITY;

-- 7. Security Policies
DROP POLICY IF EXISTS "Admins can manage machines" ON public.attendance_machines;
CREATE POLICY "Admins can manage machines" ON public.attendance_machines FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 1)
);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.attendance_settings;
CREATE POLICY "Admins can manage settings" ON public.attendance_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 1)
);

DROP POLICY IF EXISTS "Anyone can view daily counts" ON public.prasadam_daily_counts;
CREATE POLICY "Anyone can view daily counts" ON public.prasadam_daily_counts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins can manage daily counts" ON public.prasadam_daily_counts;
CREATE POLICY "Admins can manage daily counts" ON public.prasadam_daily_counts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 1)
);
