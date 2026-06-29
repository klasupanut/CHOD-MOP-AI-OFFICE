-- CHOD AI OFFICE core schema.
-- Schema only. No real Google Sheet data is inserted or modified by this migration.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  role text not null default 'member',
  agent_name text,
  is_active boolean not null default true,
  last_sign_in_provider text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_lowercase check (email = lower(email)),
  constraint profiles_role_check check (role in ('super_admin', 'director', 'manager', 'engineer', 'foreman', 'member', 'viewer'))
);

create table if not exists public.approved_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  role text not null default 'member',
  agent_name text,
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approved_users_email_lowercase check (email = lower(email)),
  constraint approved_users_role_check check (role in ('super_admin', 'director', 'manager', 'engineer', 'foreman', 'member', 'viewer'))
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique,
  project_name text not null,
  project_type text,
  site text,
  description text,
  status text not null default 'Draft',
  priority text not null default 'Medium',
  start_date date,
  due_date date,
  project_manager_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  contract_value numeric not null default 0,
  budget numeric not null default 0,
  source_module text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility text,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  task_title text not null,
  task_description text,
  category text,
  assigned_to uuid references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  status text not null default 'Open',
  priority text not null default 'Medium',
  due_date date,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  note text,
  source_module text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_no text unique not null,
  quotation_type text,
  project_type text,
  main_contractor text,
  project_id uuid references public.projects(id) on delete set null,
  site text,
  customer_name text,
  amount numeric not null default 0,
  currency text not null default 'THB',
  status text not null default 'Draft',
  internal_approval_status text not null default 'Waiting Approval',
  customer_signing_status text not null default 'Not Sent',
  requested_by uuid references public.profiles(id),
  approver_id uuid references public.profiles(id),
  pdf_url text,
  source_module text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotations_internal_approval_status_check check (internal_approval_status in ('Waiting Approval', 'Approved', 'Rejected')),
  constraint quotations_customer_signing_status_check check (customer_signing_status in ('Not Sent', 'Sent', 'Viewed', 'Signed', 'Expired', 'Cancelled'))
);

create table if not exists public.quotation_approvals (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  approver_id uuid references public.profiles(id),
  status text not null default 'Waiting Approval',
  note text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotation_approvals_status_check check (status in ('Waiting Approval', 'Approved', 'Rejected'))
);

create table if not exists public.approval_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  can_approve_quotation boolean not null default false,
  approval_scopes text[] not null default '{}',
  max_approval_amount numeric,
  requires_tammasit_final_approval boolean not null default true,
  enabled boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  file_name text not null,
  file_type text,
  category text,
  file_url text,
  uploaded_by uuid references public.profiles(id),
  status text not null default 'Active',
  source_module text,
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text,
  target_menu text,
  target_url text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  project_id uuid references public.projects(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null default '{}',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_approved_users_email on public.approved_users (email);
create index if not exists idx_projects_manager on public.projects (project_manager_id);
create index if not exists idx_project_assignments_project on public.project_assignments (project_id);
create index if not exists idx_project_assignments_user on public.project_assignments (user_id);
create index if not exists idx_tasks_assigned_to on public.tasks (assigned_to);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_quotations_no on public.quotations (quotation_no);
create index if not exists idx_quotations_status on public.quotations (internal_approval_status, customer_signing_status);
create index if not exists idx_quotation_approvals_quote on public.quotation_approvals (quotation_id);
create index if not exists idx_notifications_recipient_read on public.notifications (recipient_id, is_read);
create index if not exists idx_activity_logs_entity on public.activity_logs (entity_type, entity_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_approved_users_updated_at
before update on public.approved_users
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger set_quotations_updated_at
before update on public.quotations
for each row execute function public.set_updated_at();

create trigger set_quotation_approvals_updated_at
before update on public.quotation_approvals
for each row execute function public.set_updated_at();

create trigger set_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.approved_users enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.tasks enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_approvals enable row level security;
alter table public.approval_permissions enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.settings enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "approved_users_select_own_email"
on public.approved_users for select
to authenticated
using (
  email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "projects_select_involved"
on public.projects for select
to authenticated
using (
  created_by = (select auth.uid())
  or project_manager_id = (select auth.uid())
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = projects.id
      and pa.user_id = (select auth.uid())
  )
);

create policy "projects_insert_authenticated"
on public.projects for insert
to authenticated
with check (created_by is null or created_by = (select auth.uid()));

create policy "projects_update_owner_or_manager"
on public.projects for update
to authenticated
using (
  created_by = (select auth.uid())
  or project_manager_id = (select auth.uid())
)
with check (
  created_by = (select auth.uid())
  or project_manager_id = (select auth.uid())
);

create policy "project_assignments_select_involved"
on public.project_assignments for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.projects p
    where p.id = project_assignments.project_id
      and (p.created_by = (select auth.uid()) or p.project_manager_id = (select auth.uid()))
  )
);

create policy "tasks_select_involved"
on public.tasks for select
to authenticated
using (
  assigned_to = (select auth.uid())
  or assigned_by = (select auth.uid())
  or updated_by = (select auth.uid())
  or exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and (p.created_by = (select auth.uid()) or p.project_manager_id = (select auth.uid()))
  )
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = tasks.project_id
      and pa.user_id = (select auth.uid())
  )
);

create policy "tasks_insert_authenticated"
on public.tasks for insert
to authenticated
with check (assigned_by is null or assigned_by = (select auth.uid()));

create policy "tasks_update_involved"
on public.tasks for update
to authenticated
using (
  assigned_to = (select auth.uid())
  or assigned_by = (select auth.uid())
  or updated_by = (select auth.uid())
)
with check (
  assigned_to = (select auth.uid())
  or assigned_by = (select auth.uid())
  or updated_by = (select auth.uid())
);

create policy "quotations_select_involved"
on public.quotations for select
to authenticated
using (
  requested_by = (select auth.uid())
  or approver_id = (select auth.uid())
  or exists (
    select 1
    from public.projects p
    where p.id = quotations.project_id
      and (p.created_by = (select auth.uid()) or p.project_manager_id = (select auth.uid()))
  )
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = quotations.project_id
      and pa.user_id = (select auth.uid())
  )
);

create policy "quotations_insert_authenticated"
on public.quotations for insert
to authenticated
with check (requested_by is null or requested_by = (select auth.uid()));

create policy "quotations_update_requester_or_approver"
on public.quotations for update
to authenticated
using (
  requested_by = (select auth.uid())
  or approver_id = (select auth.uid())
)
with check (
  requested_by = (select auth.uid())
  or approver_id = (select auth.uid())
);

create policy "quotation_approvals_select_involved"
on public.quotation_approvals for select
to authenticated
using (
  requested_by = (select auth.uid())
  or approver_id = (select auth.uid())
);

create policy "quotation_approvals_update_approver"
on public.quotation_approvals for update
to authenticated
using (approver_id = (select auth.uid()))
with check (approver_id = (select auth.uid()));

create policy "approval_permissions_select_own"
on public.approval_permissions for select
to authenticated
using (user_id = (select auth.uid()));

create policy "documents_select_involved"
on public.documents for select
to authenticated
using (
  uploaded_by = (select auth.uid())
  or exists (
    select 1
    from public.projects p
    where p.id = documents.project_id
      and (p.created_by = (select auth.uid()) or p.project_manager_id = (select auth.uid()))
  )
  or exists (
    select 1
    from public.project_assignments pa
    where pa.project_id = documents.project_id
      and pa.user_id = (select auth.uid())
  )
);

create policy "documents_insert_own"
on public.documents for insert
to authenticated
with check (uploaded_by is null or uploaded_by = (select auth.uid()));

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (recipient_id = (select auth.uid()));

create policy "notifications_update_read_own"
on public.notifications for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy "activity_logs_select_own"
on public.activity_logs for select
to authenticated
using (actor_id = (select auth.uid()));

create policy "activity_logs_insert_own"
on public.activity_logs for insert
to authenticated
with check (actor_id is null or actor_id = (select auth.uid()));
