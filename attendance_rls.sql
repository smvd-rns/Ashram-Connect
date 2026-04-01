-- RLS Policies for Attendance Security
-- Ensure users can only see their own attendance logs based on their mapped email.

-- 1. Policies for attendance_user_mapping
ALTER TABLE public.attendance_user_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own mapping" ON public.attendance_user_mapping;
CREATE POLICY "Users can view their own mapping" 
ON public.attendance_user_mapping FOR SELECT 
USING (user_email = auth.jwt()->>'email');

-- 2. Policies for physical_attendance
ALTER TABLE public.physical_attendance ENABLE ROW LEVEL SECURITY;

-- Note: We join with attendance_user_mapping via machine serial/device_sn
DROP POLICY IF EXISTS "Users can view their own attendance logs" ON public.physical_attendance;
CREATE POLICY "Users can view their own attendance logs" 
ON public.physical_attendance FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.attendance_user_mapping m
    JOIN public.attendance_machines am ON m.machine_id = am.id
    WHERE m.user_email = auth.jwt()->>'email'
    AND am.serial_number = device_sn
    AND m.zk_user_id = physical_attendance.zk_user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);

-- Admin full access for mapping
DROP POLICY IF EXISTS "Admins can manage mapping" ON public.attendance_user_mapping;
CREATE POLICY "Admins can manage mapping" 
ON public.attendance_user_mapping FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 1
  )
);
