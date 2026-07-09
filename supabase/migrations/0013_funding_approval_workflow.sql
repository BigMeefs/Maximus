-- Funding approval workflow — requests £100 or below auto-approve; anything
-- over £100 goes to "Pending Manager Approval" and must be resolved by a
-- manager via the funding approval queue.

alter type funding_application_status add value 'Pending Manager Approval';

alter table funding_records
  add column approved_by text,
  add column approved_at timestamptz,
  add column manager_notes text;
