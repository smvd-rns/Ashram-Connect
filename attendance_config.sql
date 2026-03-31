-- Machine whitelist with individual time windows
CREATE TABLE IF NOT EXISTS public.attendance_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    start_time TIME DEFAULT '02:00:00',
    end_time TIME DEFAULT '07:30:00',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Global Settings (Sync Start Date still applies globally)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    sync_from_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.attendance_settings (id, sync_from_date)
VALUES ('global', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- Pre-populate with current authorized machines and default spirituality window
INSERT INTO public.attendance_machines (serial_number, description, start_time, end_time)
VALUES ('TFEE255000216', 'Original ZKTeco Machine', '02:00:00', '07:30:00'),
       ('NCD8253500015', 'New eSSL Machine', '02:00:00', '07:30:00')
ON CONFLICT (serial_number) DO NOTHING;
