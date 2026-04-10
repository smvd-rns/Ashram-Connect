-- [REQUIRED] TRAVEL DESK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS travel_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email_id TEXT NOT NULL,
    devotee_name TEXT NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    places_of_travel TEXT NOT NULL,
    purpose_of_travel TEXT NOT NULL,
    accompanying_bcari TEXT,
    counselor_email TEXT,
    status TEXT DEFAULT 'Pending', -- [Pending, Processed, Rejected]
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE travel_submissions ENABLE ROW LEVEL SECURITY;

-- POLICY: MANAGER & ADMIN ACCESS (Role 1 & 5)
-- Full visibility for the Travel Desk manager and Super Admins
DROP POLICY IF EXISTS manager_all_travel ON travel_submissions;
CREATE POLICY manager_all_travel ON travel_submissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN (1, 5)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN (1, 5)
        )
    );

-- POLICY: USER ACCESS (Self - Dual Lookup)
-- BCDB members can view data matching their user_id OR their email
DROP POLICY IF EXISTS user_own_travel ON travel_submissions;
CREATE POLICY user_own_travel ON travel_submissions
    FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        email_id = (SELECT email FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (user_id = auth.uid());

-- TRIGGER: updated_at
DROP TRIGGER IF EXISTS trigger_update_travel_timestamp ON travel_submissions;
CREATE OR REPLACE FUNCTION update_travel_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_travel_timestamp
BEFORE UPDATE ON travel_submissions
FOR EACH ROW
EXECUTE FUNCTION update_travel_timestamp();

-- Helpful Indexes
CREATE INDEX IF NOT EXISTS idx_travel_user ON travel_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_status ON travel_submissions(status);
CREATE INDEX IF NOT EXISTS idx_travel_created ON travel_submissions(created_at);
