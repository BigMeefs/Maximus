-- Announcements — short admin-authored notices shown on every advisor's
-- dashboard (see "Notifications and announcements" card). Distinct from the
-- existing Notifications feed (Income Tracker Portal submissions awaiting
-- review, computed from income_tracker_entries) — these are manually
-- written, company-wide messages, not derived from participant records.

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table announcements disable row level security;

create trigger announcements_set_updated_at
  before update on announcements
  for each row execute function set_updated_at();
