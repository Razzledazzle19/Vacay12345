-- ============================================================
-- 009_job_photos.sql
-- Creates job_photos table for cleaner photo uploads,
-- creates the job-photos storage bucket, and adds RLS for
-- cleaners (insert), hosts (read their properties), admins (all).
-- ============================================================

-- ── job_photos table ──────────────────────────────────────────
create table public.job_photos (
  id           uuid        primary key default gen_random_uuid(),
  job_id       uuid        not null references public.jobs (id) on delete cascade,
  uploaded_by  uuid        not null references public.profiles (id),
  storage_path text        not null,
  caption      text,
  created_at   timestamptz not null default now()
);

alter table public.job_photos enable row level security;

-- Cleaners can insert photos for jobs assigned to them
create policy "job_photos: cleaner insert"
  on public.job_photos for insert
  with check (
    auth.uid() = uploaded_by
    and exists (
      select 1 from public.jobs
      where id = job_id and cleaner_id = auth.uid()
    )
  );

-- Cleaners can read photos for their own jobs
create policy "job_photos: cleaner select"
  on public.job_photos for select
  using (
    exists (
      select 1 from public.jobs
      where id = job_id and cleaner_id = auth.uid()
    )
  );

-- Hosts can read photos for jobs on their properties
create policy "job_photos: host select"
  on public.job_photos for select
  using (
    exists (
      select 1 from public.jobs j
      join public.properties p on p.id = j.property_id
      where j.id = job_id and p.owner_id = auth.uid()
    )
  );

-- Admins can read all photos
create policy "job_photos: admin select"
  on public.job_photos for select
  using (public.is_admin());

create policy "job_photos: admin all"
  on public.job_photos for all
  using (public.is_admin());

-- ── Storage bucket ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos',
  'job-photos',
  false,
  10485760,  -- 10 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Storage RLS: cleaners can upload to jobs/{jobId}/*
create policy "storage: cleaner upload job photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (string_to_array(name, '/'))[1] = 'jobs'
    and exists (
      select 1 from public.jobs
      where id::text = (string_to_array(name, '/'))[2]
        and cleaner_id = auth.uid()
    )
  );

-- Storage RLS: cleaners can read photos for their jobs
create policy "storage: cleaner read job photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-photos'
    and exists (
      select 1 from public.jobs
      where id::text = (string_to_array(name, '/'))[2]
        and cleaner_id = auth.uid()
    )
  );

-- Storage RLS: hosts can read photos for their properties' jobs
create policy "storage: host read job photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-photos'
    and exists (
      select 1 from public.jobs j
      join public.properties p on p.id = j.property_id
      where j.id::text = (string_to_array(name, '/'))[2]
        and p.owner_id = auth.uid()
    )
  );

-- Storage RLS: admins can do everything
create policy "storage: admin job photos"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'job-photos'
    and public.is_admin()
  );
