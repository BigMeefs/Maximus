-- Aligns four tabs with the Self Employment Team's actual operational
-- process. Every change here backfills from the data it replaces rather
-- than discarding it outright.

-- ---------------------------------------------------------------------------
-- 1. Digital Presence — per-item status instead of a single active/inactive
-- flag, so an advisor can record "this platform genuinely isn't needed for
-- this business" distinctly from "not started yet". Not Needed counts as
-- complete for progress purposes (see src/lib/business-rules.ts).
-- ---------------------------------------------------------------------------
create type digital_presence_status as enum ('Complete', 'In Progress', 'Not Started', 'Not Needed');

alter table digital_presence_items add column status digital_presence_status not null default 'Not Started';

update digital_presence_items
set status = case when is_active then 'Complete' else 'Not Started' end::digital_presence_status;

alter table digital_presence_items drop column is_active;

-- ---------------------------------------------------------------------------
-- 2. HMRC & Business — simplified to what the team actually records:
-- Business Structure, UTR, three tick boxes (Bank Account / Insurance /
-- VAT / PAYE) and one free-text Notes field. Accountant details and the
-- separate HMRC Registration Date are no longer tracked; their content
-- (where present) is preserved by folding into Notes rather than deleted
-- outright.
-- ---------------------------------------------------------------------------
alter table hmrc_business_info add column insurance_in_place boolean not null default false;
update hmrc_business_info set insurance_in_place = (insurance_status is not null and insurance_status <> '');

alter table hmrc_business_info add column notes text;
update hmrc_business_info
set notes = trim(both E'\n' from
  concat_ws(E'\n',
    case when tax_deadline_notes is not null and tax_deadline_notes <> '' then 'Tax deadline notes: ' || tax_deadline_notes else null end,
    case when accountant_name is not null and accountant_name <> '' then 'Accountant: ' || accountant_name else null end,
    case when accountant_contact is not null and accountant_contact <> '' then 'Accountant contact: ' || accountant_contact else null end,
    case when insurance_status is not null and insurance_status <> '' then 'Insurance detail: ' || insurance_status else null end
  )
)
where tax_deadline_notes is not null or accountant_name is not null or accountant_contact is not null or insurance_status is not null;

update hmrc_business_info set notes = null where notes = '';

alter table hmrc_business_info
  drop column hmrc_registration_date,
  drop column insurance_status,
  drop column accountant_name,
  drop column accountant_contact,
  drop column tax_deadline_notes;

-- Business Structure dropdown gains Partnership / CIC / Other.
alter type business_structure rename to business_structure_old;

create type business_structure as enum ('Sole Trader', 'Limited Company', 'Partnership', 'CIC', 'Other');

alter table hmrc_business_info
  alter column business_structure type business_structure using (business_structure::text::business_structure);

drop type business_structure_old;

-- ---------------------------------------------------------------------------
-- 3. Gainful Decision checklist — "Bank Statements Provided" is replaced by
-- "Expected To Make A Profit".
-- ---------------------------------------------------------------------------
alter table gainful_assessments add column expected_to_make_profit boolean not null default false;
alter table gainful_assessments drop column bank_statements_provided;

-- Gateway booking + outcome — tracked directly on the participant, same as
-- the existing gateway_target_date / gateway_notes fields. Gateway Outcome
-- feeds the same is_gse flag the Trading Start eligibility engine already
-- reads (see src/lib/actions/gateway.ts).
create type gateway_booked_status as enum ('Not Booked', 'Booked', 'Completed');
create type gateway_outcome as enum ('GSE', 'NGSE');

alter table participants
  add column gateway_booked_status gateway_booked_status not null default 'Not Booked',
  add column gateway_appointment_date date,
  add column gateway_outcome gateway_outcome;

-- ---------------------------------------------------------------------------
-- 4. Journey — "Initial Appointment" milestone is removed at the
-- application layer only (src/lib/journey-timeline.ts); it was never
-- stored, so there's no schema change here.
-- ---------------------------------------------------------------------------
