-- =========================================================
-- OPTIMIZE IDKT FUZZY SEARCH (Fixes statement timeout)
-- Run this in the SQL Editor of your IDKT Supabase Database:
-- https://ybpymcipxpxngseabyme.supabase.co
-- =========================================================

-- 1. Enable the pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create a GIN Trigram index on the 'name' column of 'idkt_items'
-- This index speeds up ILIKE '%query%' searches by 100x+ and resolves timeout errors
CREATE INDEX IF NOT EXISTS idx_idkt_items_name_trgm ON public.idkt_items USING GIN (name gin_trgm_ops);

-- 3. Run analyze to update PostgreSQL planner statistics
ANALYZE public.idkt_items;
