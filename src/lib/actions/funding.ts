"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FundingApplicationStatus } from "@/types/database";

export type FundingFormState = {
  error?: string;
};

function revalidateParticipant() {
  revalidatePath("/advisors/[advisorId]", "layout");
}

function readFundingFields(formData: FormData) {
  return {
    fundingSource: formData.get("funding_source")?.toString().trim() ?? "",
    amountRequested: numberOrNull(formData.get("amount_requested")),
    amountApproved: numberOrNull(formData.get("amount_approved")),
    amountReceived: numberOrNull(formData.get("amount_received")),
    fundingPurpose: formData.get("funding_purpose")?.toString().trim() || null,
    applicationStatus: formData.get("application_status")?.toString() as FundingApplicationStatus,
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

  if (!fields.fundingSource) {
    return { error: "Funding source is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("funding_records").insert({
    participant_id: participantId,
    funding_source: fields.fundingSource,
    amount_requested: fields.amountRequested,
    amount_approved: fields.amountApproved,
    amount_received: fields.amountReceived,
    funding_purpose: fields.fundingPurpose,
    application_status: fields.applicationStatus || "Draft",
    application_date: fields.applicationDate,
    decision_date: fields.decisionDate,
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

  if (!fields.fundingSource) {
    return { error: "Funding source is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("funding_records")
    .update({
      funding_source: fields.fundingSource,
      amount_requested: fields.amountRequested,
      amount_approved: fields.amountApproved,
      amount_received: fields.amountReceived,
      funding_purpose: fields.fundingPurpose,
      application_status: fields.applicationStatus || "Draft",
      application_date: fields.applicationDate,
      decision_date: fields.decisionDate,
      notes: fields.notes,
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
