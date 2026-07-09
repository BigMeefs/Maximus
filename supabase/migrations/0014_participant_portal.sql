-- Participant Income Tracker Portal: participant-submitted income tracker
-- entries (public, email-matched, no login) need a few extra fields beyond
-- what the advisor-facing tab and the Google Apps Script sync already use,
-- plus a review workflow so advisors know a submission needs a look.

alter table income_tracker_entries
  add column miles numeric(10, 2) not null default 0,
  add column declaration_file_path text,
  add column declaration_file_name text,
  add column reviewed boolean not null default false,
  add column reviewed_by text,
  add column reviewed_at timestamptz;

-- Existing rows (manual entries, Google Apps Script sync) predate the
-- review workflow and were never meant to need one — only Participant
-- Portal submissions are surfaced as "needs review" (see
-- src/lib/data/notifications.ts), so leaving reviewed = false on them is
-- harmless: they're simply never queried by source = 'Participant Portal'.

create index income_tracker_entries_source_reviewed_idx
  on income_tracker_entries (source, reviewed);

-- Storage bucket for participant-uploaded earnings declarations, same
-- open-access pattern as every other document bucket in this project (see
-- 0006_funding_documents_storage.sql) — RLS is disabled project-wide by
-- design (see README "Security model"), so this doesn't add or remove any
-- protection beyond what already exists.
insert into storage.buckets (id, name, public)
values ('income-tracker-declarations', 'income-tracker-declarations', false)
on conflict (id) do nothing;

create policy "Open access to income tracker declarations"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'income-tracker-declarations')
  with check (bucket_id = 'income-tracker-declarations');
