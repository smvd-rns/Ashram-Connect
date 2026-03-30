-- Update Profiles Table for Simplified Tracking
DO $$ 
BEGIN 
    -- 1. Add the last_visit_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_visit_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- 2. Add an index for efficient "Who visited today" queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='profiles' AND indexname='profiles_last_visit_at_idx') THEN
        CREATE INDEX profiles_last_visit_at_idx ON public.profiles (last_visit_at);
    END IF;
END $$;

-- 3. Cleanup: (Optional) If you were already using the user_visits table, 
-- you can drop it to keep the database small and lean.
-- DROP TABLE IF EXISTS public.user_visits;
