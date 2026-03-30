-- 1. Drop ALL dependencies first to avoid "cannot drop column" errors
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Only Super Admins can update roles" ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create/Update Profiles Table safely
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Safely handle the ROLE column (Migrate from TEXT to INTEGER if needed)
DO $$ 
BEGIN 
    -- If the column exists and is TEXT, migrate it
    IF (SELECT data_type FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') = 'text' THEN
        -- Map existing string roles to numbers
        ALTER TABLE public.profiles RENAME COLUMN role TO role_old;
        ALTER TABLE public.profiles ADD COLUMN role INTEGER NOT NULL DEFAULT 6;
        
        UPDATE public.profiles SET role = 1 WHERE role_old = 'Super Admin';
        UPDATE public.profiles SET role = 2 WHERE role_old = 'BC Video Uploader';
        UPDATE public.profiles SET role = 3 WHERE role_old = 'Attendance Incharge';
        UPDATE public.profiles SET role = 4 WHERE role_old = 'BC';
        UPDATE public.profiles SET role = 5 WHERE role_old = 'Manager';
        UPDATE public.profiles SET role = 6 WHERE role_old = 'Viewer' OR role_old IS NULL;
        
        ALTER TABLE public.profiles DROP COLUMN role_old;
    
    -- If it doesn't exist at all, just create it
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role INTEGER NOT NULL DEFAULT 6;
    END IF;

    -- Standardize constraints
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role BETWEEN 1 AND 6);
END $$;

-- 4. Safely add other columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='mobile') THEN
        ALTER TABLE public.profiles ADD COLUMN mobile TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='temple') THEN
        ALTER TABLE public.profiles ADD COLUMN temple TEXT;
    END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Helper Functions for RLS (Avoid Recursion)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_uploader() 
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 1 OR role = 2)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 7. Re-create Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND (role IS NULL OR role = (SELECT role FROM public.profiles WHERE id = auth.uid()))); -- Prevent users from changing their own role

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Only Super Admins can update roles" ON public.profiles;
CREATE POLICY "Only Super Admins can update roles" 
ON public.profiles FOR UPDATE 
USING (is_admin());

DROP POLICY IF EXISTS "Super Admins have full access" ON public.profiles;
CREATE POLICY "Super Admins have full access" 
ON public.profiles FOR ALL 
USING (is_admin());

-- 7. Initial Backfill (Run safely)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 6
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 8. Automatic Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 6)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
