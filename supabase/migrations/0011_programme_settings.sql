-- Programme Settings — configurable Trading Start / Outcome thresholds, plus
-- the new GSE and Claim Closed markers that drive the two non-NGSE Trading
-- Start paths. Nothing here changes existing Trading Start / IWT / Outcome
-- data; it only adds new inputs the rules engine reads instead of the
-- previously hard-coded £900 / £5,300 / 6-month constants.

create table programme_settings (
  id uuid primary key default gen_random_uuid(),
  ngse_average_threshold numeric(10, 2) not null default 900,
  outcome_target numeric(10, 2) not null default 5300,
  outcome_period_months integer not null default 6,
  gse_outcome_period_months integer not null default 6,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table programme_settings disable row level security;

create trigger programme_settings_set_updated_at
  before update on programme_settings
  for each row execute function set_updated_at();

-- Singleton seed row — the application always reads/updates the single most
-- recently created row rather than requiring a fixed, known id.
insert into programme_settings default values;

-- ---------------------------------------------------------------------------
-- GSE marker — a point-in-time advisor assertion that a participant is
-- Gainfully Self Employed, distinct from the existing pre-Trading-Start
-- Gainful Decision readiness checklist (gainful_assessments).
-- ---------------------------------------------------------------------------
alter table participants
  add column is_gse boolean not null default false,
  add column gse_marked_at timestamptz,
  add column gse_marked_by text;

-- ---------------------------------------------------------------------------
-- Claim Closed marker — a point-in-time advisor assertion that a
-- participant's Restart claim has closed while they remain self-employed.
-- Kept separate from the existing generic participants.status = 'Closed'
-- (which means "outcome not achieved, case closed").
-- ---------------------------------------------------------------------------
alter table participants
  add column claim_closed boolean not null default false,
  add column claim_closed_at timestamptz,
  add column claim_closed_by text;
