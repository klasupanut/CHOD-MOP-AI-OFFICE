-- Security/performance advisor fixes for CHOD AI OFFICE core schema.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "approved_users_select_own_email" on public.approved_users;

create policy "approved_users_select_own_email"
on public.approved_users for select
to authenticated
using (
  email = (select lower(coalesce((auth.jwt() ->> 'email'), '')))
);
