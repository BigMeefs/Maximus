-- Self Employment Toolkit: business journey, gateway/gainful readiness,
-- funding, HMRC info, digital presence, evidence categorisation, and the
-- extra monthly performance fields the toolkit builds on top of the
-- existing CRM. Nothing here removes or changes existing behaviour.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type business_stage as enum (
  'Idea', 'Research', 'Business Planning', 'Financial Planning',
  'HMRC Registration', 'Ready to Trade', 'Trading',
  'Gateway Preparation', 'Gateway Complete', 'Gainful Assessment', 'Gainful Decision'
);

create type rag_status as enum ('Green', 'Amber', 'Red');

create type funding_application_status as enum (
  'Draft', 'Applied', 'Approved', 'Declined', 'Received'
);

create type business_structure as enum ('Sole Trader', 'Limited Company');

create type digital_platform as enum (
  'Website', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok',
  'Google Business Profile', 'YouTube', 'Online Booking', 'Google Reviews'
);

-- Only the checklist items with no natural data source elsewhere; the rest
-- (Business Plan, HMRC Registration, UTR, Insurance, Business Bank Account,
-- Website, Evidence Uploaded, Trading Started) are derived automatically at
-- read time from business_plans / hmrc_business_info / digital_presence_items
-- / evidence_files / participants.business_stage.
create type gateway_checklist_item as enum (
  'Market Research', 'Competitor Analysis', 'Pricing', 'Cashflow Forecast',
  'Marketing Plan', 'Branding', 'Social Media', 'Invoices Available'
);

create type gainful_recommendation as enum ('Ready', 'Needs Further Evidence', 'Not Yet Ready');

-- ---------------------------------------------------------------------------
-- participants: journey, RAG, gateway target, health confidence
-- ---------------------------------------------------------------------------
alter table participants
  add column business_sector text,
  add column business_stage business_stage not null default 'Idea',
  add column business_stage_updated_at timestamptz not null default now(),
  add column rag_status rag_status not null default 'Green',
  add column rag_note text,
  add column gateway_target_date date,
  add column health_confidence smallint check (health_confidence between 0 and 100);

create function set_business_stage_updated_at() returns trigger as $$
begin
  if new.business_stage is distinct from old.business_stage then
    new.business_stage_updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger participants_stage_updated_at
  before update on participants
  for each row execute function set_business_stage_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_earnings -> Monthly Business Performance (extend, don't duplicate)
-- ---------------------------------------------------------------------------
alter table monthly_earnings
  add column expenses numeric(10, 2) not null default 0,
  add column hours_worked numeric(6, 1),
  add column customer_count integer,
  add column largest_customer text,
  add column notes text;

-- ---------------------------------------------------------------------------
-- evidence_files -> Evidence Vault categorisation
-- ---------------------------------------------------------------------------
create type evidence_category as enum (
  'Business Plan', 'Cashflow', 'Invoices', 'Receipts', 'Quotes',
  'Bank Statements', 'Insurance', 'Certificates', 'Marketing Material',
  'Photos', 'Other'
);

alter table evidence_files
  add column category evidence_category not null default 'Other';

-- ---------------------------------------------------------------------------
-- Funding Tracker
-- ---------------------------------------------------------------------------
create table funding_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  funding_source text not null,
  amount_requested numeric(10, 2),
  amount_approved numeric(10, 2),
  amount_received numeric(10, 2),
  funding_purpose text,
  application_status funding_application_status not null default 'Draft',
  application_date date,
  decision_date date,
  file_path text,
  file_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index funding_records_participant_id_idx on funding_records (participant_id);
alter table funding_records disable row level security;

create trigger funding_records_set_updated_at
  before update on funding_records
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- HMRC & Business Information (one row per participant)
-- ---------------------------------------------------------------------------
create table hmrc_business_info (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  business_structure business_structure,
  utr_number text,
  hmrc_registration_date date,
  vat_registered boolean not null default false,
  paye_registered boolean not null default false,
  business_bank_account boolean not null default false,
  insurance_status text,
  accountant_name text,
  accountant_contact text,
  tax_deadline_notes text,
  updated_at timestamptz not null default now()
);

alter table hmrc_business_info disable row level security;

create trigger hmrc_business_info_set_updated_at
  before update on hmrc_business_info
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Digital Presence Tracker
-- ---------------------------------------------------------------------------
create table digital_presence_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  platform digital_platform not null,
  is_active boolean not null default false,
  url text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (participant_id, platform)
);

alter table digital_presence_items disable row level security;

create trigger digital_presence_items_set_updated_at
  before update on digital_presence_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Gateway Readiness Checklist (manual-only items; see enum comment above)
-- ---------------------------------------------------------------------------
create table gateway_checklist_items (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants (id) on delete cascade,
  item gateway_checklist_item not null,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (participant_id, item)
);

alter table gateway_checklist_items disable row level security;

create trigger gateway_checklist_items_set_updated_at
  before update on gateway_checklist_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Gainful Decision Dashboard (one row per participant)
-- ---------------------------------------------------------------------------
create table gainful_assessments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references participants (id) on delete cascade,
  trading_consistently boolean not null default false,
  hours_worked_adequate boolean not null default false,
  bank_statements_provided boolean not null default false,
  customer_base_established boolean not null default false,
  business_sustainable boolean not null default false,
  advisor_recommendation text,
  manager_approval boolean not null default false,
  manager_notes text,
  overall_recommendation gainful_recommendation not null default 'Not Yet Ready',
  updated_at timestamptz not null default now()
);

alter table gainful_assessments disable row level security;

create trigger gainful_assessments_set_updated_at
  before update on gainful_assessments
  for each row execute function set_updated_at();
