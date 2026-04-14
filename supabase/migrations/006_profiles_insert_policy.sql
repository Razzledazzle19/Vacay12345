-- ============================================================
-- 006_profiles_insert_policy.sql
-- Allows authenticated users to insert their own profile row.
-- Required for post-email-confirmation profile creation on
-- first login, and for the signup flow when email confirmation
-- is disabled.
-- ============================================================

create policy "profiles: owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);
