-- Add hcustom_place column to harinam_attendance table
ALTER TABLE public.harinam_attendance ADD COLUMN IF NOT EXISTS hcustom_place TEXT;
