-- BCDB (Ashram Connect) Table Schema
-- Automatically generated mapping from "NVCC Ashram Connect.xlsx"

-- [REQUIRED] Enable UUID extension for id generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bcdb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiated_name TEXT,
    legal_name TEXT,
    initiation TEXT,
    colour TEXT,
    spiritual_master TEXT,
    dob_adhar DATE,
    dob_actual DATE,
    contact_no TEXT,
    email_id TEXT UNIQUE, -- Added UNIQUE for onConflict updates
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
    photo_url TEXT,
    relative_contact_1 TEXT,
    relative_contact_2 TEXT,
    relative_contact_3 TEXT,
    email_address TEXT,
    adhar_card_copy_url TEXT,
    pan_card_copy_url TEXT,
    parents_address TEXT,
    whatsapp_no TEXT,
    custom_counsellor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [ENSURE CONSTRAINT] In case table was already created without it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bcdb_email_id_key') THEN
        ALTER TABLE bcdb ADD CONSTRAINT bcdb_email_id_key UNIQUE (email_id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE bcdb ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
DROP POLICY IF EXISTS admin_all_bcdb ON bcdb;
CREATE POLICY admin_all_bcdb ON bcdb
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 1
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 1
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_bcdb_timestamp ON bcdb;
CREATE OR REPLACE FUNCTION update_bcdb_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bcdb_timestamp
BEFORE UPDATE ON bcdb
FOR EACH ROW
EXECUTE FUNCTION update_bcdb_timestamp();

-- Helpful Indexes
CREATE INDEX IF NOT EXISTS idx_bcdb_email ON bcdb(email_id);
CREATE INDEX IF NOT EXISTS idx_bcdb_legal_name ON bcdb(legal_name);
CREATE INDEX IF NOT EXISTS idx_bcdb_initiated_name ON bcdb(initiated_name);
