-- ============================================================
-- 007_fix_recursive_rls.sql
-- The admin policies used a subquery on public.profiles to check
-- if the current user is an admin, causing infinite recursion and
-- breaking ALL reads on every affected table.
-- Fix: use a security definer function that bypasses RLS.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles: admin select" on public.profiles;
drop policy if exists "profiles: admin update" on public.profiles;
drop policy if exists "profiles: admin delete" on public.profiles;

create policy "profiles: admin select" on public.profiles for select using (public.is_admin());
create policy "profiles: admin update" on public.profiles for update using (public.is_admin());
create policy "profiles: admin delete" on public.profiles for delete using (public.is_admin());

drop policy if exists "properties: admin select" on public.properties;
drop policy if exists "properties: admin insert" on public.properties;
drop policy if exists "properties: admin update" on public.properties;
drop policy if exists "properties: admin delete" on public.properties;

create policy "properties: admin select" on public.properties for select using (public.is_admin());
create policy "properties: admin insert" on public.properties for insert with check (public.is_admin());
create policy "properties: admin update" on public.properties for update using (public.is_admin());
create policy "properties: admin delete" on public.properties for delete using (public.is_admin());

drop policy if exists "jobs: admin all" on public.jobs;
create policy "jobs: admin all" on public.jobs for all using (public.is_admin());

drop policy if exists "content_sections: admin all" on public.content_sections;
create policy "content_sections: admin all" on public.content_sections for all using (public.is_admin());

drop policy if exists "subscriptions: admin all" on public.subscriptions;
create policy "subscriptions: admin all" on public.subscriptions for all using (public.is_admin());

drop policy if exists "supply_items: admin all" on public.supply_items;
create policy "supply_items: admin all" on public.supply_items for all using (public.is_admin());

drop policy if exists "supply_orders: admin all" on public.supply_orders;
create policy "supply_orders: admin all" on public.supply_orders for all using (public.is_admin());

drop policy if exists "supply_order_items: admin all" on public.supply_order_items;
create policy "supply_order_items: admin all" on public.supply_order_items for all using (public.is_admin());
