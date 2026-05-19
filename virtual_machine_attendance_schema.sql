-- Virtual Machine Incharge mapping (one incharge per virtual machine)
create table if not exists public.virtual_machine_incharge_mapping (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.attendance_machines(id) on delete cascade,
  incharge_user_id uuid not null references public.profiles(id) on delete cascade,
  incharge_user_email text not null,
  assigned_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vm_incharge_user_id
  on public.virtual_machine_incharge_mapping(incharge_user_id);

-- Allow multiple incharges per machine but avoid duplicate same user+machine assignment
alter table public.virtual_machine_incharge_mapping
  drop constraint if exists virtual_machine_incharge_mapping_machine_id_key;

alter table public.virtual_machine_incharge_mapping
  add constraint vm_incharge_machine_user_unique unique (machine_id, incharge_user_id);

-- Role 7 virtual machine attendance with simple P/A status
create table if not exists public.virtual_machine_attendance (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.attendance_machines(id) on delete cascade,
  user_email text not null,
  date date not null,
  status text not null check (status in ('P', 'A')),
  marked_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (machine_id, user_email, date)
);

create index if not exists idx_vm_attendance_date
  on public.virtual_machine_attendance(date);

-- Allow new role 7 (Virtual Machine Incharge)
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role between 1 and 7);

-- ---------------------------------------------------------
-- Enable RLS (Row Level Security)
-- ---------------------------------------------------------
alter table public.virtual_machine_incharge_mapping enable row level security;
alter table public.virtual_machine_attendance enable row level security;

-- ---------------------------------------------------------
-- Grant access per role
-- ---------------------------------------------------------
grant select on public.virtual_machine_incharge_mapping to anon;
grant select, insert, update, delete on public.virtual_machine_incharge_mapping to authenticated;
grant select, insert, update, delete on public.virtual_machine_incharge_mapping to service_role;

grant select on public.virtual_machine_attendance to anon;
grant select, insert, update, delete on public.virtual_machine_attendance to authenticated;
grant select, insert, update, delete on public.virtual_machine_attendance to service_role;

-- ---------------------------------------------------------
-- Security Policies
-- ---------------------------------------------------------

-- policies for virtual_machine_incharge_mapping
drop policy if exists "Admins can manage incharge mappings" on public.virtual_machine_incharge_mapping;
create policy "Admins can manage incharge mappings"
  on public.virtual_machine_incharge_mapping for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 1));

drop policy if exists "Incharges can view their own mappings" on public.virtual_machine_incharge_mapping;
create policy "Incharges can view their own mappings"
  on public.virtual_machine_incharge_mapping for select
  to authenticated
  using (incharge_user_id = auth.uid());

-- policies for virtual_machine_attendance
drop policy if exists "Admins can manage VM attendance" on public.virtual_machine_attendance;
create policy "Admins can manage VM attendance"
  on public.virtual_machine_attendance for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 1));

drop policy if exists "Incharges can manage attendance for assigned machines" on public.virtual_machine_attendance;
create policy "Incharges can manage attendance for assigned machines"
  on public.virtual_machine_attendance for all
  to authenticated
  using (
    exists (
      select 1 from public.virtual_machine_incharge_mapping
      where incharge_user_id = auth.uid() and machine_id = virtual_machine_attendance.machine_id
    )
  );
