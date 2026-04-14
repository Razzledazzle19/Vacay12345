-- ============================================================
-- 005_job_acceptance.sql
-- Adds acceptance_status to jobs for the cleaner
-- accept / decline workflow.
-- ============================================================

-- Add the new column with a safe default so existing rows are
-- treated as already-accepted (hosts who created them before
-- this feature existed won't suddenly see "awaiting response").
alter table public.jobs
  add column acceptance_status text not null default 'pending_acceptance'
    check (acceptance_status in ('pending_acceptance', 'accepted', 'declined'));

-- Allow cleaners to update jobs assigned to them.
-- The WITH CHECK allows cleaner_id to become NULL so that a
-- cleaner can "decline" by clearing their own assignment.
create policy "jobs: cleaner update acceptance"
  on public.jobs for update
  using  (auth.uid() = cleaner_id)
  with check (
    auth.uid() = cleaner_id   -- accepting (stays assigned)
    or cleaner_id is null     -- declining (clears assignment)
  );
