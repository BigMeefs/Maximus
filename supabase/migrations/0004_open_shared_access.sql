-- Remove per-advisor Supabase Auth login: advisors now just pick their name
-- from a list, and everyone shares full access to every participant.

-- ---------------------------------------------------------------------------
-- Drop auth-scoped policies
-- ---------------------------------------------------------------------------
drop policy if exists "Advisors manage their own participants" on participants;
drop policy if exists "Advisors manage business plans of their participants" on business_plans;
drop policy if exists "Advisors manage earnings of their participants" on monthly_earnings;
drop policy if exists "Advisors manage evidence of their participants" on evidence_files;
drop policy if exists "Advisors manage actions of their participants" on action_plan_items;
drop policy if exists "Advisors manage appointments of their participants" on appointments;
drop policy if exists "Profiles are viewable by any authenticated advisor" on profiles;

-- ---------------------------------------------------------------------------
-- Drop the profile-on-signup trigger/function and the profiles table itself;
-- advisors are now a fixed constant list, not Supabase Auth users.
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop table if exists profiles;

-- ---------------------------------------------------------------------------
-- Replace participants.advisor_id (uuid -> auth.users) with a plain advisor
-- name, constrained to the four known advisors.
-- ---------------------------------------------------------------------------
alter table participants drop constraint if exists participants_advisor_id_fkey;
alter table participants add column advisor_name text;
update participants set advisor_name = 'Kyle' where advisor_name is null;
alter table participants alter column advisor_name set not null;
alter table participants add constraint participants_advisor_name_check
  check (advisor_name in ('Kyle', 'Charles', 'Elliott', 'Aroosa'));
alter table participants drop column advisor_id;

drop index if exists participants_advisor_id_idx;
create index participants_advisor_name_idx on participants (advisor_name);

-- ---------------------------------------------------------------------------
-- Open access: there is no Supabase Auth session anymore, so every request
-- uses the anon key. Disable RLS on our own tables (equivalent to a fully
-- permissive policy, but simpler to reason about for an internal tool with
-- no real security boundary between advisors).
--
-- WARNING: this exposes every row in these tables to anyone holding the
-- anon key (which ships in the browser bundle). Only appropriate for a
-- private/internal deployment that isn't otherwise publicly reachable.
-- ---------------------------------------------------------------------------
alter table participants disable row level security;
alter table business_plans disable row level security;
alter table monthly_earnings disable row level security;
alter table evidence_files disable row level security;
alter table action_plan_items disable row level security;
alter table appointments disable row level security;

-- ---------------------------------------------------------------------------
-- Storage: we don't own storage.objects, so replace the per-advisor-folder
-- policies with simple per-bucket open policies instead of disabling RLS.
-- ---------------------------------------------------------------------------
drop policy if exists "Advisors manage their own business plan files" on storage.objects;
drop policy if exists "Advisors manage their own evidence files" on storage.objects;

create policy "Open access to business plan files"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'business-plans')
  with check (bucket_id = 'business-plans');

create policy "Open access to evidence files"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'evidence-files')
  with check (bucket_id = 'evidence-files');
