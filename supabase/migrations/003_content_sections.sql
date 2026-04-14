-- ============================================================
-- 003_content_sections.sql
-- Creates the content_sections table used by host/cleaner
-- dashboards and the admin content management tab.
--
-- Column notes (must match app code exactly):
--   is_active  boolean  — app filters with .eq('is_active', true)
--                         and toggles with { is_active: !item.is_active }
--   audience   text     — app queries .in('audience', ['host', 'all'])
--                         and .in('audience', ['cleaner', 'all'])
--                         so values are 'host' | 'cleaner' | 'all'
--   updated_at          — written by admin content tab on every save
-- ============================================================

create table public.content_sections (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null
                check (type in ('announcement', 'guideline', 'resource')),
  title       text        not null,
  body        text        not null,
  audience    text        not null
                check (audience in ('host', 'cleaner', 'all')),
  is_active   boolean     not null default false,
  created_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.content_sections enable row level security;

-- ------------------------------------------------------------
-- Authenticated users (hosts & cleaners) can read active rows
-- that are targeted at their role or at everyone.
-- The profile lookup resolves 'host'/'cleaner' from profiles.role.
-- ------------------------------------------------------------
create policy "content_sections: authenticated read"
  on public.content_sections for select
  using (
    is_active = true
    and (
      audience = 'all'
      or audience = (
        select role from public.profiles
        where id = auth.uid()
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
