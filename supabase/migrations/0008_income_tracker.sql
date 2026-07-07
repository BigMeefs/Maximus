-- Income Tracker: entries fed in from the external client income-tracker
-- form (Netlify + Google Apps Script), matched to a participant by email.
--
-- Kept as its own table rather than folded into monthly_earnings so the
-- externally-submitted figures and the advisor-entered Monthly Performance
-- tab never silently overwrite each other — they're two different sources
-- of truth for two different tabs.

create table income_tracker_entries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  month date not null,
  entry_date date not null,
  income numeric(10, 2) not null default 0,
  expense numeric(10, 2) not null default 0,
  mileage_cost numeric(10, 2) not null default 0,
  notes text,
  source text not null default 'income-tracker',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, month)
);

create index income_tracker_entries_participant_id_idx
  on income_tracker_entries (participant_id);

alter table income_tracker_entries disable row level security;

create trigger income_tracker_entries_set_updated_at
  before update on income_tracker_entries
  for each row execute function set_updated_at();
