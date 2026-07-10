-- Funding Source: enforced as a fixed dropdown (Business Card / BACS /
-- Voucher) at the application layer (see src/types/database.ts
-- FUNDING_SOURCES and src/lib/actions/funding.ts). Deliberately NOT a
-- Postgres enum/CHECK constraint here — existing funding_records already
-- contain values outside that set (e.g. "Maximus"), and forcing those rows
-- into one of the three new options would misrepresent real historical
-- data. The UI never offers free text going forward; the two known legacy
-- rows are left exactly as they are.

-- Gateway Assessment card gets a free-text advisor notes field (previously
-- nothing captured this).
alter table participants add column gateway_notes text;

-- Gainful Decision card gets an explicit decision date (previously only
-- implied by gainful_assessments.updated_at).
alter table gainful_assessments add column decision_date date;

-- Journey: "Gainful Assessment" is no longer its own stage — a Gateway now
-- covers that assessment. No participant currently sits at this stage, so
-- this is a clean removal with no data to migrate.
alter type business_stage rename to business_stage_old;

create type business_stage as enum (
  'Idea',
  'Research',
  'Business Planning',
  'Financial Planning',
  'HMRC Registration',
  'Ready to Trade',
  'Trading',
  'Gateway Preparation',
  'Gateway Complete',
  'Gainful Decision'
);

alter table participants
  alter column business_stage drop default,
  alter column business_stage type business_stage using (business_stage::text::business_stage),
  alter column business_stage set default 'Idea';

drop type business_stage_old;
