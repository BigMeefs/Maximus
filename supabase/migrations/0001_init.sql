-- Self Employment Caseload Manager: initial schema
-- Advisors are Supabase Auth users. Each advisor can only see/edit their own participants.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type business_plan_status as enum ('Not Started', 'In Progress', 'Complete');
create type action_status as enum ('Not Started', 'In Progress', 'Complete');

-- ---------------------------------------------------------------------------
-- Profiles (one row per advisor / auth user)
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by any authenticated advisor"
  on profiles for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Participants
-- ---------------------------------------------------------------------------
create table participants (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references auth.users (id),
  ptp_name text not null,
  business_name text not null,
  previous_advisor text,
  scheme_start_date date not null,
  website text,
  social_media_links text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participants_advisor_id_idx on participants (advisor_id);

alter table participants enable row level security;

create policy "Advisors manage their own participants"
  on participants for all
  to authenticated
  using (advisor_id = auth.uid())
  with check (advisor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Business plans (one per participant)
-- ---------------------------------------------------------------------------
create table business_plans (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  status business_plan_status not null default 'Not Started',
  file_path text,
  file_name text,
  updated_at timestamptz not null default now()
);

alter table business_plans enable row level security;

create policy "Advisors manage business plans of their participants"
  on business_plans for all
  to authenticated
  using (exists (select 1 from participants p where p.id = business_plans.participant_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from participants p where p.id = business_plans.participant_id and p.advisor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Monthly earnings
-- ---------------------------------------------------------------------------
create table monthly_earnings (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  month date not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  unique (participant_id, month)
);

create index monthly_earnings_participant_id_idx on monthly_earnings (participant_id);

alter table monthly_earnings enable row level security;

create policy "Advisors manage earnings of their participants"
  on monthly_earnings for all
  to authenticated
  using (exists (select 1 from participants p where p.id = monthly_earnings.participant_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from participants p where p.id = monthly_earnings.participant_id and p.advisor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Evidence library
-- ---------------------------------------------------------------------------
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create index evidence_files_participant_id_idx on evidence_files (participant_id);

alter table evidence_files enable row level security;

create policy "Advisors manage evidence of their participants"
  on evidence_files for all
  to authenticated
  using (exists (select 1 from participants p where p.id = evidence_files.participant_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from participants p where p.id = evidence_files.participant_id and p.advisor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Action plan items (ongoing tracker + historical record)
-- ---------------------------------------------------------------------------
create table action_plan_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  description text not null,
  status action_status not null default 'Not Started',
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index action_plan_items_participant_id_idx on action_plan_items (participant_id);

alter table action_plan_items enable row level security;

create policy "Advisors manage actions of their participants"
  on action_plan_items for all
  to authenticated
  using (exists (select 1 from participants p where p.id = action_plan_items.participant_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from participants p where p.id = action_plan_items.participant_id and p.advisor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Appointment history
-- ---------------------------------------------------------------------------
create table appointments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  appointment_date date not null,
  advisor_name text not null,
  notes text,
  outcome text,
  created_at timestamptz not null default now()
);

create index appointments_participant_id_idx on appointments (participant_id);

alter table appointments enable row level security;

create policy "Advisors manage appointments of their participants"
  on appointments for all
  to authenticated
  using (exists (select 1 from participants p where p.id = appointments.participant_id and p.advisor_id = auth.uid()))
  with check (exists (select 1 from participants p where p.id = appointments.participant_id and p.advisor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger participants_set_updated_at
  before update on participants
  for each row execute function set_updated_at();

create trigger business_plans_set_updated_at
  before update on business_plans
  for each row execute function set_updated_at();

create trigger action_plan_items_set_updated_at
  before update on action_plan_items
  for each row execute function set_updated_at();
