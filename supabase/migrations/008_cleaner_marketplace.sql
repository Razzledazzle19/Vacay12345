-- ============================================================
-- 008_cleaner_marketplace.sql
-- Turns the cleaner experience into a job marketplace:
--   • Add lat/lng to properties for radius filtering
--   • Cleaners can read ALL properties and unassigned jobs
--   • Cleaners can claim an unassigned job (set themselves as cleaner)
-- ============================================================

-- Add coordinates to properties
alter table public.properties
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;

-- Cleaners can read all properties (needed to browse the job board)
drop policy if exists "properties: cleaner read all" on public.properties;
create policy "properties: cleaner read all"
  on public.properties for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'cleaner'
    )
  );

-- Cleaners can read ALL jobs (unassigned ones for the job board + their own)
drop policy if exists "jobs: cleaner select" on public.jobs;
create policy "jobs: cleaner select"
  on public.jobs for select
  using (
    cleaner_id is null
    or auth.uid() = cleaner_id
  );

-- Cleaners can claim an unassigned job (set cleaner_id to themselves)
drop policy if exists "jobs: cleaner claim" on public.jobs;
create policy "jobs: cleaner claim"
  on public.jobs for update
  using  (cleaner_id is null)
  with check (auth.uid() = cleaner_id);
