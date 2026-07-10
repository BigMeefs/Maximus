"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FUNDING_SOURCES, type FundingApplicationStatus } from "@/types/database";

export type FundingFormState = {
  error?: string;
};

// Requests at or below this amount approve themselves; anything over goes to
// a manager's Funding Approval Queue. Only a manager decision (via
// approveFundingRequest / rejectFundingRequest) can move a request out of
// "Pending Manager Approval" once it's reached that state.
const AUTO_APPROVAL_THRESHOLD = 100;

function revalidateParticipant() {
  revalidatePath("/advisors/[advisorId]", "layout");
  revalidatePath("/admin/funding-approvals");
}

function autoStatus(amountRequested: number | null): FundingApplicationStatus {
  if (amountRequested === null) return "Draft";
  return amountRequested <= AUTO_APPROVAL_THRESHOLD ? "Approved" : "Pending Manager Approval";
}

function readFundingFields(formData: FormData) {
  return {
    fundingSource: formData.get("funding_source")?.toString().trim() ?? "",
    amountRequested: numberOrNull(formData.get("amount_requested")),
    amountApproved: numberOrNull(formData.get("amount_approved")),
    amountReceived: numberOrNull(formData.get("amount_received")),
    fundingPurpose: formData.get("funding_purpose")?.toString().trim() || null,
    applicationDate: formData.get("application_date")?.toString() || null,
    decisionDate: formData.get("decision_date")?.toString() || null,
    notes: formData.get("notes")?.toString().trim() || null,
  };
}

function numberOrNull(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export async function createFundingRecord(
  participantId: string,
  _prevState: FundingFormState,
  formData: FormData,
): Promise<FundingFormState> {
  const fields = readFundingFields(formData);

  if (!FUNDING_SOURCES.includes(fields.fundingSource as (typeof FUNDING_SOURCES)[number])) {
    return { error: "Select a valid funding source." };
  }

  const status = autoStatus(fields.amountRequested);
  const supabase = await createClient();
  const { error } = await supabase.from("funding_records").insert({
    participant_id: participantId,
    funding_source: fields.fundingSource,
    amount_requested: fields.amountRequested,
    // A request that auto-approves is, by definition, approved for the
    // amount requested.
    amount_approved: status === "Approved" ? fields.amountRequested : fields.amountApproved,
    amount_received: fields.amountReceived,
    funding_purpose: fields.fundingPurpose,
    application_status: status,
    application_date: fields.applicationDate,
    decision_date: status === "Approved" ? new Date().toISOString().slice(0, 10) : fields.decisionDate,
    approved_by: status === "Approved" ? "Automatic (at or below £100)" : null,
    approved_at: status === "Approved" ? new Date().toISOString() : null,
    notes: fields.notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

export async function updateFundingRecord(
  recordId: string,
  _prevState: FundingFormState,
  formData: FormData,
): Promise<FundingFormState> {
  const fields = readFundingFields(formData);
  const supabase = await createClient();

  // Once a manager has decided a request (or it's auto-approved), an
  // advisor editing the record afterwards must not silently flip the
  // decision — only approveFundingRequest / rejectFundingRequest can do
  // that. Only requests still awaiting a decision get their status
  // recomputed from the (possibly just-edited) amount requested.
  const { data: existing } = await supabase
    .from("funding_records")
    .select("application_status, approved_by, funding_source")
    .eq("id", recordId)
    .maybeSingle();

  // The dropdown always offers the fixed set of sources plus (for records
  // that predate this restriction) the record's own current value, so a
  // legacy value like "Maximus" can be kept without forcing it into one of
  // the three new options.
  const isValidSource =
    FUNDING_SOURCES.includes(fields.fundingSource as (typeof FUNDING_SOURCES)[number]) ||
    fields.fundingSource === existing?.funding_source;
  if (!isValidSource) {
    return { error: "Select a valid funding source." };
  }

  const isDecided = !!existing?.approved_by || existing?.application_status === "Received";
  const status = isDecided ? existing!.application_status : autoStatus(fields.amountRequested);

  const { error } = await supabase
    .from("funding_records")
    .update({
      funding_source: fields.fundingSource,
      amount_requested: fields.amountRequested,
      amount_approved:
        !isDecided && status === "Approved" ? fields.amountRequested : fields.amountApproved,
      amount_received: fields.amountReceived,
      funding_purpose: fields.fundingPurpose,
      application_status: status,
      application_date: fields.applicationDate,
      decision_date:
        !isDecided && status === "Approved" ? new Date().toISOString().slice(0, 10) : fields.decisionDate,
      approved_by: !isDecided && status === "Approved" ? "Automatic (at or below £100)" : existing?.approved_by,
      approved_at: !isDecided && status === "Approved" ? new Date().toISOString() : null,
      notes: fields.notes,
    })
    .eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

// ---------------------------------------------------------------------------
// Manager decisions — the only way a "Pending Manager Approval" request
// moves forward. Manager/Admin only (Administration panel is passcode-gated).
// ---------------------------------------------------------------------------
export async function approveFundingRequest(
  recordId: string,
  managerName: string,
  _prevState: FundingFormState,
  formData: FormData,
): Promise<FundingFormState> {
  const notes = formData.get("manager_notes")?.toString().trim() || null;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("funding_records")
    .select("amount_requested")
    .eq("id", recordId)
    .maybeSingle();

  const { error } = await supabase
    .from("funding_records")
    .update({
      application_status: "Approved",
      amount_approved: record?.amount_requested ?? null,
      decision_date: new Date().toISOString().slice(0, 10),
      approved_by: managerName,
      approved_at: new Date().toISOString(),
      manager_notes: notes,
    })
    .eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

export async function rejectFundingRequest(
  recordId: string,
  managerName: string,
  _prevState: FundingFormState,
  formData: FormData,
): Promise<FundingFormState> {
  const notes = formData.get("manager_notes")?.toString().trim() || null;
  const supabase = await createClient();

  const { error } = await supabase
    .from("funding_records")
    .update({
      application_status: "Declined",
      decision_date: new Date().toISOString().slice(0, 10),
      approved_by: managerName,
      approved_at: new Date().toISOString(),
      manager_notes: notes,
    })
    .eq("id", recordId);

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

export async function deleteFundingRecord(recordId: string) {
  const supabase = await createClient();
  await supabase.from("funding_records").delete().eq("id", recordId);
  revalidateParticipant();
}

export async function uploadFundingDocument(
  recordId: string,
  formData: FormData,
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const supabase = await createClient();
  const path = `${recordId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("funding-documents")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  await supabase
    .from("funding_records")
    .update({ file_path: path, file_name: file.name })
    .eq("id", recordId);

  revalidateParticipant();
}

export async function getFundingDocumentUrl(filePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("funding-documents")
    .createSignedUrl(filePath, 60 * 60);

  return data?.signedUrl ?? null;
}
