-- Run this in the NEW Supabase SQL Editor to sync schema with the old DB
ALTER TABLE public.idkt_items 
ADD COLUMN IF NOT EXISTS error_count INT4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT;
