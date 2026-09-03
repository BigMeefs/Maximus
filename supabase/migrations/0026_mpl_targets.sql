-- Minimum Performance Level (MPL) — Admin-configurable monthly targets for
-- Trading Starts and Outcomes, tracked one row per calendar month
-- (effective_month, always the 1st of the month) rather than as a single
-- current-value setting like programme_settings. This is deliberate: MPL
-- must not retroactively change how past months are judged, so each row
-- is a permanent historical record of "what the target was, starting this
-- month" — editing MPL from the admin UI only ever upserts the row for the
-- CURRENT month; every earlier row is left untouched.
--
-- The target that applies to any given month is the most recent row at or
-- before that month (see getMplForMonth in src/lib/data/mpl.ts) — so a
-- month with no row of its own inherits whatever was set previously, and
-- a month before any MPL was ever configured has no applicable target at
-- all (percentage-achieved calculations skip it rather than guessing).
create table mpl_targets (
  id uuid primary key default gen_random_uuid(),
  effective_month date not null unique,
  trading_starts_mpl integer not null,
  outcomes_mpl integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create index mpl_targets_effective_month_idx on mpl_targets (effective_month);

alter table mpl_targets disable row level security;

create trigger mpl_targets_set_updated_at
  before update on mpl_targets
  for each row execute function set_updated_at();
