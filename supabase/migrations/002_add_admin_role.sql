-- ============================================================
-- 002_add_admin_role.sql
-- Extends the role check constraint to include 'admin' and
-- adds RLS policies granting admins full access to all tables.
-- ============================================================

-- ------------------------------------------------------------
-- profiles: expand role check constraint
-- ------------------------------------------------------------
alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('host', 'cleaner', 'admin'));

-- Admins can read all profiles
create policy "profiles: admin select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Admins can update all profiles
create policy "profiles: admin update"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Admins can delete profiles
create policy "profiles: admin delete"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- properties: admin full access
-- ------------------------------------------------------------
create policy "properties: admin select"
  on public.properties for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "properties: admin insert"
  on public.properties for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "properties: admin update"
  on public.properties for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "properties: admin delete"
  on public.properties for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- jobs: admin full access
-- ------------------------------------------------------------
create policy "jobs: admin select"
  on public.jobs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "jobs: admin insert"
  on public.jobs for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "jobs: admin update"
  on public.jobs for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

create policy "jobs: admin delete"
  on public.jobs for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
