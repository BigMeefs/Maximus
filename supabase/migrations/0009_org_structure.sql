-- Organisational structure: Company -> Office -> Advisor -> Participants.
--
-- Replaces the fixed four-advisor model (participants.advisor_name text,
-- constrained to a hard-coded CHECK list) with normalised offices/advisors
-- tables and real foreign keys, so unlimited offices and advisors can be
-- added through the Administration panel with no code changes.
--
-- A participant's "office" is deliberately NOT stored as its own column —
-- it's always derived via participant -> advisor -> office. That means
-- transferring a participant to an advisor in a different office (or
-- moving an advisor to a different office) automatically updates every
-- participant's effective office for free, with no sync code required.

-- ---------------------------------------------------------------------------
-- Offices
-- ---------------------------------------------------------------------------
create table offices (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table offices disable row level security;

create trigger offices_set_updated_at
  before update on offices
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Advisors
-- ---------------------------------------------------------------------------
create type advisor_status as enum ('Active', 'Inactive');

create table advisors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  office_id uuid not null references offices (id),
  job_title text,
  status advisor_status not null default 'Active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advisors_office_id_idx on advisors (office_id);

alter table advisors disable row level security;

create trigger advisors_set_updated_at
  before update on advisors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Participant transfer audit log
-- ---------------------------------------------------------------------------
create table participant_transfers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  from_advisor_id uuid references advisors (id),
  to_advisor_id uuid not null references advisors (id),
  from_office_id uuid references offices (id),
  to_office_id uuid not null references offices (id),
  transferred_by text,
  notes text,
  created_at timestamptz not null default now()
);

create index participant_transfers_participant_id_idx
  on participant_transfers (participant_id);

alter table participant_transfers disable row level security;

-- ---------------------------------------------------------------------------
-- Migrate the existing four hard-coded advisors into the new structure.
-- The office name and advisor emails below are placeholders — rename the
-- office and edit each advisor's email/job title from the Administration
-- panel after this migration runs.
-- ---------------------------------------------------------------------------
insert into offices (name) values ('Main Office');

insert into advisors (full_name, email, office_id, job_title, status)
select name, email, (select id from offices where name = 'Main Office'), 'Advisor', 'Active'
from (values
  ('Kyle', 'kyle@placeholder.internal'),
  ('Charles', 'charles@placeholder.internal'),
  ('Elliott', 'elliott@placeholder.internal'),
  ('Aroosa', 'aroosa@placeholder.internal')
) as seed(name, email);

-- ---------------------------------------------------------------------------
-- participants: advisor_name text -> advisor_id uuid
-- ---------------------------------------------------------------------------
alter table participants add column advisor_id uuid references advisors (id);

update participants p
set advisor_id = a.id
from advisors a
where a.full_name = p.advisor_name;

alter table participants alter column advisor_id set not null;
alter table participants drop constraint participants_advisor_name_check;
drop index if exists participants_advisor_name_idx;
alter table participants drop column advisor_name;

create index participants_advisor_id_idx on participants (advisor_id);

-- ---------------------------------------------------------------------------
-- appointments: advisor_name text -> advisor_id uuid
-- (records which advisor conducted the appointment; may differ from the
-- participant's currently assigned advisor if someone covered for them)
-- ---------------------------------------------------------------------------
alter table appointments add column advisor_id uuid references advisors (id);

update appointments ap
set advisor_id = a.id
from advisors a
where a.full_name = ap.advisor_name;

alter table appointments alter column advisor_id set not null;
alter table appointments drop column advisor_name;
