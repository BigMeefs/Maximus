-- Data Sync module: import matching-key fields on participants, plus saved
-- field mappings, import history, and per-row import error detail.
--
-- Note: national_insurance_number is a sensitive UK national identifier.
-- This project already runs with RLS disabled (see 0004_open_shared_access),
-- so storing it here carries the same open-access tradeoff as everything
-- else in this database — flagged here for visibility, not blocking, since
-- it was explicitly requested for participant matching.

-- ---------------------------------------------------------------------------
-- participants: matching-key fields used by the import engine
-- ---------------------------------------------------------------------------
alter table participants
  add column external_participant_id text,
  add column email text,
  add column phone text,
  add column date_of_birth date,
  add column national_insurance_number text;

create unique index participants_external_participant_id_key
  on participants (external_participant_id)
  where external_participant_id is not null;

create index participants_email_idx on participants (lower(email))
  where email is not null;

-- ---------------------------------------------------------------------------
-- Saved field mapping (spreadsheet column -> CRM field), reused on future
-- imports so advisors don't have to remap every time.
-- ---------------------------------------------------------------------------
create table import_field_mappings (
  id uuid primary key default gen_random_uuid(),
  source_column text not null unique,
  target_field text not null,
  updated_at timestamptz not null default now()
);

alter table import_field_mappings disable row level security;

create trigger import_field_mappings_set_updated_at
  before update on import_field_mappings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Import History
-- ---------------------------------------------------------------------------
create type import_status as enum ('Success', 'Partial', 'Failed');

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by text not null,
  file_name text not null,
  source text not null default 'file',
  row_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  skipped_count integer not null default 0,
  status import_status not null default 'Success',
  notes text,
  created_at timestamptz not null default now()
);

create index import_batches_created_at_idx on import_batches (created_at desc);
alter table import_batches disable row level security;

-- ---------------------------------------------------------------------------
-- Per-row import errors (drives the downloadable error report)
-- ---------------------------------------------------------------------------
create table import_errors (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches (id) on delete cascade,
  row_number integer not null,
  error_message text not null,
  row_data jsonb,
  created_at timestamptz not null default now()
);

create index import_errors_batch_id_idx on import_errors (import_batch_id);
alter table import_errors disable row level security;
