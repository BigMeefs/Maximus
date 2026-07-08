-- Trading Start (TS) / In Work Tracking (IWT) / Outcome workflow.
--
-- Adds a case-management "status" to participants, distinct from the
-- existing business_stage (which tracks business readiness, not the
-- participant's relationship to the Restart Scheme programme itself).

create type participant_status as enum (
  'Referral',
  'Active',
  'Trading Start',
  'In Work Tracking',
  'Outcome Achieved',
  'Closed'
);

alter table participants
  add column status participant_status not null default 'Active';

create index participants_status_idx on participants (status);

-- ---------------------------------------------------------------------------
-- Status history — every change, timestamped.
-- ---------------------------------------------------------------------------
create table participant_status_history (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  from_status participant_status,
  to_status participant_status not null,
  changed_by text,
  notes text,
  created_at timestamptz not null default now()
);

create index participant_status_history_participant_id_idx
  on participant_status_history (participant_id);

alter table participant_status_history disable row level security;

-- Backfill one history row per existing participant so the timeline has a
-- starting point.
insert into participant_status_history (participant_id, from_status, to_status, changed_by, notes)
select id, null, 'Active', 'system', 'Backfilled when Trading Start / IWT / Outcome tracking was introduced.'
from participants;

-- ---------------------------------------------------------------------------
-- Trading Starts
-- ---------------------------------------------------------------------------
create type trading_start_reason as enum (
  'GSE',
  'NGSE',
  'Claim Closed Whilst Self Employed'
);

create table trading_starts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  trading_start_date date not null,
  reason trading_start_reason not null,
  -- Captured permanently at creation time so original-advisor TS/outcome
  -- statistics stay stable even if the participant is later transferred
  -- again for unrelated reasons.
  original_advisor_id uuid not null references advisors (id),
  iwt_advisor_id uuid not null references advisors (id),
  transfer_date date not null,
  evidence_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trading_starts_participant_id_idx on trading_starts (participant_id);
create index trading_starts_original_advisor_id_idx on trading_starts (original_advisor_id);
create index trading_starts_iwt_advisor_id_idx on trading_starts (iwt_advisor_id);

alter table trading_starts disable row level security;

create trigger trading_starts_set_updated_at
  before update on trading_starts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- IWT Reviews — each row is one completed review, carrying the date the
-- next one is due.
-- ---------------------------------------------------------------------------
create table iwt_reviews (
  id uuid primary key default gen_random_uuid(),
  trading_start_id uuid not null references trading_starts (id) on delete cascade,
  review_date date not null,
  next_review_date date,
  notes text,
  reviewed_by_advisor_id uuid references advisors (id),
  created_at timestamptz not null default now()
);

create index iwt_reviews_trading_start_id_idx on iwt_reviews (trading_start_id);

alter table iwt_reviews disable row level security;

-- ---------------------------------------------------------------------------
-- Outcome Records — one per Trading Start.
-- ---------------------------------------------------------------------------
create table outcome_records (
  id uuid primary key default gen_random_uuid(),
  trading_start_id uuid not null unique references trading_starts (id) on delete cascade,
  outcome_date date not null,
  outcome_type trading_start_reason not null,
  outcome_achieved boolean not null,
  evidence text,
  advisor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table outcome_records disable row level security;

create trigger outcome_records_set_updated_at
  before update on outcome_records
  for each row execute function set_updated_at();
