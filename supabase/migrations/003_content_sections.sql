-- ============================================================
-- 003_content_sections.sql
-- Creates the content_sections table used by host/cleaner
-- dashboards and the admin content management tab.
-- ============================================================

create table public.content_sections (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null
                check (type in ('announcement', 'guideline', 'resource')),
  title       text        not null,
  body        text        not null,
  audience    text        not null
                check (audience in ('hosts', 'cleaners', 'all')),
  status      text        not null default 'draft'
                check (status in ('draft', 'active')),
  created_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.content_sections enable row level security;

-- ------------------------------------------------------------
-- Authenticated users (hosts & cleaners) can read active rows
-- targeted at their role or at everyone.
-- profiles.role is 'host'/'cleaner'; audience uses 'hosts'/'cleaners'
-- so we append 's' to resolve the match.
-- ------------------------------------------------------------
create policy "content_sections: authenticated read"
  on public.content_sections for select
  using (
    status = 'active'
    and (
      audience = 'all'
      or audience = (
        select p.role || 's' from public.profiles p
        where p.id = auth.uid()
      )
    )
  );

-- ------------------------------------------------------------
-- Admins can read all rows (including drafts).
-- ------------------------------------------------------------
create policy "content_sections: admin select"
  on public.content_sections for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- ------------------------------------------------------------
-- Admins can insert, update, and delete all rows.
-- ------------------------------------------------------------
create policy "content_sections: admin insert"
  on public.content_sections for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "content_sections: admin update"
  on public.content_sections for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

create policy "content_sections: admin delete"
  on public.content_sections for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );
