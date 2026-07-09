"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateMileageCost } from "@/lib/mileage";

// ---------------------------------------------------------------------------
// Participant Income Tracker Portal — public, no login. Every function here
// is written to return the absolute minimum a participant should ever see:
// a first name on a successful email match, or a generic "not found"
// message. Nothing here ever returns a participant record, another
// participant's data, or any CRM data beyond what this one form needs.
//
// This does NOT add real access control beyond what already exists (or
// doesn't) in this project — RLS is disabled and the anon key is public by
// design (see README "Security model"). These functions just make sure the
// app's own UI never surfaces more than it should; someone querying
// Supabase directly still has the same access they always did.
// ---------------------------------------------------------------------------

export async function lookupParticipantByEmail(
  email: string,
): Promise<{ id: string; firstName: string } | null> {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, ptp_name")
    .ilike("email", trimmed)
    .maybeSingle();

  if (error) console.error("lookupParticipantByEmail error:", error);
  if (!data) return null;

  const firstName = data.ptp_name.trim().split(/\s+/)[0] || data.ptp_name;
  return { id: data.id, firstName };
}

export type PortalSubmitState = {
  error?: string;
  success?: {
    mileageCost: number;
    netProfit: number;
  };
};

function numberOrZero(value: FormDataEntryValue | null) {
  const num = Number(value?.toString().trim() || 0);
  return Number.isNaN(num) ? 0 : num;
}

export async function submitPortalIncomeEntry(
  _prevState: PortalSubmitState,
  formData: FormData,
): Promise<PortalSubmitState> {
  const participantId = formData.get("participant_id")?.toString() ?? "";
  const entryDate = formData.get("entry_date")?.toString() ?? "";
  const grossIncome = numberOrZero(formData.get("gross_income"));
  const businessExpenses = numberOrZero(formData.get("business_expenses"));
  const miles = numberOrZero(formData.get("miles"));
  const notes = formData.get("notes")?.toString().trim() || null;
  const file = formData.get("declaration_file");

  if (!participantId || !entryDate) {
    return { error: "Something went wrong — please refresh and try again." };
  }

  const supabase = await createClient();

  // Re-verify the participant exists rather than trusting the hidden field
  // outright — cheap, and means a submission can never silently attach to
  // an id that isn't a real participant.
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .maybeSingle();

  if (!participant) {
    return { error: "Something went wrong — please refresh and try again." };
  }

  const mileageCost = calculateMileageCost(miles);
  const netProfit = grossIncome - businessExpenses - mileageCost;
  const month = `${entryDate.slice(0, 7)}-01`;

  let declarationFilePath: string | null = null;
  let declarationFileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    const path = `${participantId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("income-tracker-declarations")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      return { error: "The form details saved, but the file upload failed: " + uploadError.message };
    }
    declarationFilePath = path;
    declarationFileName = file.name;
  }

  const { error } = await supabase.from("income_tracker_entries").upsert(
    {
      participant_id: participantId,
      month,
      entry_date: entryDate,
      income: grossIncome,
      expense: businessExpenses,
      miles,
      mileage_cost: mileageCost,
      notes,
      declaration_file_path: declarationFilePath,
      declaration_file_name: declarationFileName,
      source: "Participant Portal",
      reviewed: false,
      reviewed_by: null,
      reviewed_at: null,
    },
    { onConflict: "participant_id,month" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/advisors/[advisorId]", "layout");
  return { success: { mileageCost, netProfit } };
}

export type ReviewFormState = {
  error?: string;
};

export async function markSubmissionReviewed(
  entryId: string,
  reviewedBy: string,
): Promise<ReviewFormState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("income_tracker_entries")
    .update({
      reviewed: true,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/advisors/[advisorId]", "layout");
  return {};
}

export async function getDeclarationFileUrl(filePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("income-tracker-declarations")
    .createSignedUrl(filePath, 60 * 60);

  return data?.signedUrl ?? null;
}
