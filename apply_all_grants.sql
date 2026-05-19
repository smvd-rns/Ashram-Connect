-- =========================================================================
-- SAFE CONSOLIDATED DATABASE GRANTS & SECURITY POLICY SCRIPT
-- Wraps each table check in a conditional DO block to prevent errors if the 
-- table does not exist in a specific Supabase project database.
--
-- This script is strictly NON-DESTRUCTIVE. It does not touch, modify, or 
-- delete any data, columns, or tables.
-- =========================================================================

-- 1. profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.profiles TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
    END IF;
END $$;

-- 2. bcdb
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bcdb') THEN
        ALTER TABLE public.bcdb ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.bcdb TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb TO service_role;
    END IF;
END $$;

-- 3. bcdb_submissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bcdb_submissions') THEN
        ALTER TABLE public.bcdb_submissions ENABLE ROW LEVEL SECURITY;
        GRANT SELECT, INSERT ON public.bcdb_submissions TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb_submissions TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.bcdb_submissions TO service_role;
    END IF;
END $$;

-- 4. attendance_machines
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_machines') THEN
        ALTER TABLE public.attendance_machines ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.attendance_machines TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_machines TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_machines TO service_role;
    END IF;
END $$;

-- 5. attendance_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_settings') THEN
        ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.attendance_settings TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_settings TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_settings TO service_role;
    END IF;
END $$;

-- 6. prasadam_daily_counts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'prasadam_daily_counts') THEN
        ALTER TABLE public.prasadam_daily_counts ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.prasadam_daily_counts TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.prasadam_daily_counts TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.prasadam_daily_counts TO service_role;
    END IF;
END $$;

-- 7. attendance_exceptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_exceptions') THEN
        ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.attendance_exceptions TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_exceptions TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_exceptions TO service_role;
    END IF;
END $$;

-- 8. attendance_user_mapping
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_user_mapping') THEN
        ALTER TABLE public.attendance_user_mapping ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.attendance_user_mapping TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_user_mapping TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_user_mapping TO service_role;
    END IF;
END $$;

-- 9. physical_attendance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'physical_attendance') THEN
        ALTER TABLE public.physical_attendance ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.physical_attendance TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.physical_attendance TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.physical_attendance TO service_role;
    END IF;
END $$;

-- 10. user_audio_favorites
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_audio_favorites') THEN
        ALTER TABLE public.user_audio_favorites ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.user_audio_favorites TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_audio_favorites TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_audio_favorites TO service_role;
    END IF;
END $$;

-- 11. harinam_attendance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'harinam_attendance') THEN
        ALTER TABLE public.harinam_attendance ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.harinam_attendance TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.harinam_attendance TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.harinam_attendance TO service_role;
    END IF;
END $$;

-- 12. idkt_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'idkt_items') THEN
        ALTER TABLE public.idkt_items ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.idkt_items TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.idkt_items TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.idkt_items TO service_role;
    END IF;
END $$;

-- 13. notifications_history
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications_history') THEN
        ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.notifications_history TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_history TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications_history TO service_role;
    END IF;
END $$;

-- 14. policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'policies') THEN
        ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.policies TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO service_role;
    END IF;
END $$;

-- 15. push_subscriptions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_subscriptions') THEN
        ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.push_subscriptions TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
    END IF;
END $$;

-- 16. youtube_channels
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_channels') THEN
        ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.youtube_channels TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channels TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channels TO service_role;
    END IF;
END $$;

-- 17. yt_videos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yt_videos') THEN
        ALTER TABLE public.yt_videos ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.yt_videos TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.yt_videos TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.yt_videos TO service_role;
    END IF;
END $$;

-- 18. yt_playlists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yt_playlists') THEN
        ALTER TABLE public.yt_playlists ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.yt_playlists TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.yt_playlists TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.yt_playlists TO service_role;
    END IF;
END $$;

-- 19. youtube_channel_assignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_channel_assignments') THEN
        ALTER TABLE public.youtube_channel_assignments ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.youtube_channel_assignments TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channel_assignments TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_channel_assignments TO service_role;
    END IF;
END $$;

-- 20. travel_submissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_submissions') THEN
        ALTER TABLE public.travel_submissions ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.travel_submissions TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_submissions TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_submissions TO service_role;
    END IF;
END $$;

-- 21. user_favorite_channels
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_favorite_channels') THEN
        ALTER TABLE public.user_favorite_channels ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.user_favorite_channels TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorite_channels TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorite_channels TO service_role;
    END IF;
END $$;

-- 22. user_favorites
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_favorites') THEN
        ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.user_favorites TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_favorites TO service_role;
    END IF;
END $$;

-- 23. user_visits
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_visits') THEN
        ALTER TABLE public.user_visits ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.user_visits TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_visits TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_visits TO service_role;
    END IF;
END $$;

-- 24. virtual_machine_incharge_mapping
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'virtual_machine_incharge_mapping') THEN
        ALTER TABLE public.virtual_machine_incharge_mapping ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.virtual_machine_incharge_mapping TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_machine_incharge_mapping TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_machine_incharge_mapping TO service_role;
    END IF;
END $$;

-- 25. virtual_machine_attendance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'virtual_machine_attendance') THEN
        ALTER TABLE public.virtual_machine_attendance ENABLE ROW LEVEL SECURITY;
        GRANT SELECT ON public.virtual_machine_attendance TO anon;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_machine_attendance TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_machine_attendance TO service_role;
    END IF;
END $$;
