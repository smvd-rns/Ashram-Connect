-- =========================================================
-- BCDB SUBMISSIONS (APPROVAL QUEUE) SCHEMA
-- Run this in your main Supabase SQL Editor
-- =========================================================

CREATE TABLE IF NOT EXISTS public.bcdb_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Mirrored from bcdb table
    initiated_name TEXT,
    legal_name TEXT,
    initiation TEXT,
    colour TEXT,
    spiritual_master TEXT,
    dob_adhar DATE,
    dob_actual DATE,
    contact_no TEXT,
    email_id TEXT, -- Not unique here, allowed multiple submissions until approval
    counsellor TEXT,
    center TEXT,
    year_joining INTEGER,
    prasadam TEXT,
    primary_services TEXT,
    secondary_services TEXT,
    blood_group TEXT,
    aadhar_number TEXT,
    address_adhar TEXT,
    pan_card TEXT,
    photo_url TEXT, -- Public URL from IDKT Storage
    relative_contact_1 TEXT,
    relative_contact_2 TEXT,
    relative_contact_3 TEXT,
    email_address TEXT,
    adhar_card_copy_url TEXT, -- Public URL from IDKT Storage
    pan_card_copy_url TEXT,   -- Public URL from IDKT Storage
    parents_address TEXT,
    whatsapp_no TEXT,
    custom_counsellor TEXT,

    -- Status Tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    
    -- Auto update timestamp
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- Enable RLS (Row Level Security)
-- ---------------------------------------------------------
ALTER TABLE public.bcdb_submissions ENABLE ROW LEVEL SECURITY;

-- Grant access per role
GRANT SELECT, INSERT ON public.bcdb_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb_submissions TO service_role;

-- Allow ANYONE (public) to insert a new submission
DROP POLICY IF EXISTS "Anyone can submit registration" ON public.bcdb_submissions;
CREATE POLICY "Anyone can submit registration" ON public.bcdb_submissions
    FOR INSERT
    WITH CHECK (true);

-- Allow Admins/Managers to view and edit submissions
DROP POLICY IF EXISTS "Admins can manage submissions" ON public.bcdb_submissions;
CREATE POLICY "Admins can manage submissions" ON public.bcdb_submissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND (profiles.role = 1 OR profiles.role = 5) -- Super Admin (1) or Manager (5)
        )
    );

-- ---------------------------------------------------------
-- Trigger for updated_at
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_bcdb_submissions_timestamp ON public.bcdb_submissions;
CREATE TRIGGER trigger_update_bcdb_submissions_timestamp
BEFORE UPDATE ON public.bcdb_submissions
FOR EACH ROW
EXECUTE FUNCTION update_bcdb_timestamp(); -- Reuses existing trigger function

-- ---------------------------------------------------------
-- Fast Retrieval Index
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bcdb_submissions_status ON public.bcdb_submissions(status);
CREATE INDEX IF NOT EXISTS idx_bcdb_submissions_submitted ON public.bcdb_submissions(submitted_at DESC);
