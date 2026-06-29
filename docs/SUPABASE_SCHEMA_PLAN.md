# Supabase Schema Plan

This is a design document only. Do not run migrations until approved.

## Data strategy

- MVP keeps mock mode and Google Sheet connectors.
- Supabase becomes the long-term operational database.
- Migrate Tasks / Projects / Approval Permissions first.
- Keep Quotation Generator integration separate until stable.
- OTP is only for customer quotation signing links, not team login.

## Core tables

### profiles

Team users mapped from Supabase Auth.

- `id uuid primary key references auth.users(id)`
- `email text unique not null`
- `display_name text not null`
- `role text not null`
- `agent_name text`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### projects

- `id uuid primary key`
- `project_name text not null`
- `project_type text`
- `site text`
- `description text`
- `status text not null`
- `priority text not null`
- `start_date date`
- `due_date date`
- `project_manager_id uuid references profiles(id)`
- `created_by uuid references profiles(id)`
- `progress integer not null default 0`
- `budget numeric not null default 0`
- timestamps

### tasks

Tasks are operational memo/tracking items. Team members may update status/progress/note across tasks.

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `task_title text not null`
- `task_description text`
- `category text`
- `assigned_to uuid references profiles(id)`
- `assigned_by uuid references profiles(id)`
- `updated_by uuid references profiles(id)`
- `status text not null`
- `priority text not null`
- `due_date date`
- `progress integer not null default 0`
- `note text`
- `source_module text`
- timestamps

### project_assignments

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `user_id uuid references profiles(id)`
- `responsibility text`
- `assigned_by uuid references profiles(id)`
- `created_at timestamptz not null default now()`

### quotations

Internal quotation data. Customer signing is a separate status from internal approval.

- `id uuid primary key`
- `quotation_no text unique not null`
- `quotation_type text`
- `project_id uuid references projects(id)`
- `site text`
- `customer_name text`
- `amount numeric not null default 0`
- `currency text not null default 'THB'`
- `status text not null`
- `internal_approval_status text`
- `customer_signing_status text`
- `requested_by uuid references profiles(id)`
- `approver_id uuid references profiles(id)`
- `pdf_url text`
- timestamps

### quotation_approvals

Approvals menu handles quotation approval only.

- `id uuid primary key`
- `quotation_id uuid references quotations(id)`
- `requested_by uuid references profiles(id)`
- `approver_id uuid references profiles(id)`
- `status text not null`
- `note text`
- `approved_at timestamptz`
- `rejected_at timestamptz`
- timestamps

### approval_permissions

- `id uuid primary key`
- `user_id uuid references profiles(id)`
- `can_approve_quotation boolean not null default false`
- `approval_scopes text[] not null default '{}'`
- `max_approval_amount numeric`
- `requires_tammasit_final_approval boolean not null default true`
- `enabled boolean not null default true`
- `updated_by uuid references profiles(id)`
- `updated_at timestamptz not null default now()`

### documents

Prepared for future document index. Not required for current MVP.

### activity_logs

Append-only audit trail for login, edits, approvals, and connector sync events.

### settings

Key/value system settings.

## Initial allowed email

- `chod.mopteam@gmail.com`

Add other team emails later from Settings.
