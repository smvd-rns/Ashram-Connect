CREATE TABLE IF NOT EXISTS public.idkt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('folder', 'audio')),
    url TEXT NOT NULL,
    parent_path TEXT NOT NULL DEFAULT '/',
    full_path TEXT UNIQUE NOT NULL,
    size TEXT,
    last_modified TIMESTAMP WITH TIME ZONE,
    is_scanned BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_idkt_parent_path ON public.idkt_items(parent_path);
CREATE INDEX IF NOT EXISTS idx_idkt_full_path ON public.idkt_items(full_path);
CREATE INDEX IF NOT EXISTS idx_idkt_type ON public.idkt_items(type);
CREATE INDEX IF NOT EXISTS idx_idkt_is_hidden ON public.idkt_items(is_hidden);

-- RLS Policies
ALTER TABLE public.idkt_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access to non-hidden items
CREATE POLICY "Allow public read access to visible items" ON public.idkt_items
    FOR SELECT USING (
        NOT is_hidden OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 1
        )
    );

-- Only Role 1 (Super Admin) can manage the database (crawling/deleting/hiding)
CREATE POLICY "Admins can manage items" ON public.idkt_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 1
        )
    );
