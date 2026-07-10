-- Notifications — a real, persisted work queue rather than the previous
-- "compute Income Tracker submissions live" approach (src/lib/data/notifications.ts's
-- original getIncomeSubmissions, kept unchanged — see README). Every
-- automatic event described in the Notifications overhaul creates one row
-- here; nothing is ever deleted by the app itself (only an explicit admin
-- "Permanently delete" does that), so this table doubles as the audit trail.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'New' check (status in ('New', 'Unread', 'Action Required', 'Reviewed', 'Archived')),
  title text not null,
  body text not null,
  participant_id uuid references participants(id) on delete cascade,
  advisor_id uuid references advisors(id) on delete set null,
  -- Polymorphic pointer at the record the notification is about (an
  -- income_tracker_entries.id, funding_records.id, trading_starts.id, ...
  -- depending on `type`) — no FK, since it targets a different table per
  -- type. Lets the app resolve/auto-archive a notification precisely when
  -- the thing it refers to is actioned, without re-deriving it from scratch.
  related_id uuid,
  -- Set only for notification types that must never have two *active* rows
  -- for the same unresolved event (see the partial unique index below).
  -- Event-style notifications (income submitted, funding decided, outcome
  -- achieved, ...) don't need this since each underlying event is itself
  -- already a one-off.
  dedupe_key text,
  reviewed_by text,
  reviewed_at timestamptz,
  archived_by text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notifications disable row level security;

create index notifications_advisor_status_idx on notifications (advisor_id, status);
create index notifications_participant_idx on notifications (participant_id);
create index notifications_type_idx on notifications (type);
create index notifications_created_at_idx on notifications (created_at desc);

-- The actual "don't duplicate an unresolved event" guarantee: only one
-- active (New/Unread/Action Required) row per dedupe_key at a time. Once
-- that row moves to Reviewed or Archived, the key frees up again.
create unique index notifications_active_dedupe_idx on notifications (dedupe_key)
  where status in ('New', 'Unread', 'Action Required') and dedupe_key is not null;

create trigger notifications_set_updated_at
  before update on notifications
  for each row execute function set_updated_at();

-- "Participant Requires Contact" reads this instead of a hard-coded number
-- of days, consistent with the rest of Programme Settings.
alter table programme_settings add column contact_period_days integer not null default 30;
