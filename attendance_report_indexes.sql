-- Performance indexes for attendance report endpoints.
-- Safe to run multiple times.

create index if not exists idx_physical_attendance_check_time
  on public.physical_attendance(check_time);

create index if not exists idx_physical_attendance_device_zk_time
  on public.physical_attendance(device_sn, zk_user_id, check_time);

create index if not exists idx_attendance_user_mapping_machine_zk
  on public.attendance_user_mapping(machine_id, zk_user_id);

create index if not exists idx_attendance_user_mapping_user_email
  on public.attendance_user_mapping(user_email);

create index if not exists idx_harinam_attendance_user_date
  on public.harinam_attendance(user_email, date);

create index if not exists idx_virtual_machine_attendance_machine_user_date
  on public.virtual_machine_attendance(machine_id, user_email, date);

create index if not exists idx_attendance_exceptions_user_date
  on public.attendance_exceptions(user_email, date);
