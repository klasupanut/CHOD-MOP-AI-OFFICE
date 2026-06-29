-- Use the Supabase recommended initplan pattern for auth.jwt() in RLS.

drop policy if exists "approved_users_select_own_email" on public.approved_users;

create policy "approved_users_select_own_email"
on public.approved_users for select
to authenticated
using (
  email = lower(coalesce(((select auth.jwt()) ->> 'email'), ''))
);
