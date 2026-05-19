-- Create the policies table
CREATE TABLE IF NOT EXISTS policies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    drive_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Grant access per role
GRANT SELECT ON policies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON policies TO service_role;

-- Policy: Authenticated users can read policies
-- Access is further restricted in the UI/API level to BCDB members
CREATE POLICY "Allow authenticated users to read policies" 
ON policies FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Admins/Service Role can manage policies
CREATE POLICY "Allow service role to manage policies" 
ON policies FOR ALL 
USING (true);
