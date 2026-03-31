-- 1. Create the User Mapping table
CREATE TABLE IF NOT EXISTS public.attendance_user_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.attendance_machines(id) ON DELETE CASCADE,
    zk_user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- UNIQUE CONSTRAINT: Prevent duplicate mapping of the same machine ID
    UNIQUE(machine_id, zk_user_id)
);

-- 2. Create index for fast lookups by email and machine
CREATE INDEX IF NOT EXISTS idx_mapping_email ON public.attendance_user_mapping(user_email);
CREATE INDEX IF NOT EXISTS idx_mapping_machine_id ON public.attendance_user_mapping(machine_id);

-- 3. Enable RLS (Row Level Security) if needed - usually handled by Service Role for admin
ALTER TABLE public.attendance_user_mapping ENABLE ROW LEVEL SECURITY;

-- 4. Simple Policy: Allow all for now (Admin access via Service Role)
CREATE POLICY "Allow all access to attendance_user_mapping" ON public.attendance_user_mapping FOR ALL USING (true);
