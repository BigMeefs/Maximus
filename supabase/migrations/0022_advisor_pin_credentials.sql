-- Advisor PIN authentication — purely additive. Does not alter the
-- advisors table or any existing data; a missing row here just means
-- "no PIN configured yet" for that advisor (see src/lib/advisor-auth.ts,
-- which blocks workspace access until an admin sets one).
--
-- PINs are never stored in plain text: pin_hash is a scrypt digest of the
-- 4-digit PIN salted with pin_salt (both generated in
-- src/lib/advisor-auth.ts using Node's built-in crypto module — no new
-- dependency). failed_attempts / locked_until implement a simple
-- per-advisor lockout after repeated incorrect attempts.

create table advisor_pin_credentials (
  advisor_id uuid primary key references advisors (id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Matches every other table in this schema (RLS disabled project-wide by
-- design — see README "Security model"); not a new exposure, since the
-- anon key already has full access to every other table.
alter table advisor_pin_credentials disable row level security;

create trigger advisor_pin_credentials_set_updated_at
  before update on advisor_pin_credentials
  for each row execute function set_updated_at();
