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
