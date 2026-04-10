-- ADD INDEXES TO SPEED UP LOGIN AND VERIFICATION
-- 1. Index for profiles table (email should be fast)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 2. Index for bcdb table (essential for the bcdb-check API)
CREATE INDEX IF NOT EXISTS idx_bcdb_email_id ON public.bcdb(email_id);
CREATE INDEX IF NOT EXISTS idx_bcdb_email_address ON public.bcdb(email_address);

-- 3. Index for travel submissions (helps devotees see history faster)
CREATE INDEX IF NOT EXISTS idx_travel_email_id ON public.travel_submissions(email_id);

-- Helpful note: Running these will make the 'Verifying...' spinner disappear almost instantly.
