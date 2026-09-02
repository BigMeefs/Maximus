"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/data/notifications";
import { findParticipantByExternalId } from "@/lib/data/referrals";

// ---------------------------------------------------------------------------
// External Self-Employment Referral System.
//
// submitReferral is the public, no-login entry point (src/app/referral/page.tsx),
// mirroring the Participant Income Tracker Portal's pattern: a standalone
// page, no nav, and a Server Action that never returns more than a
// generic success/error. The chosen advisor (or "No preference", as null)
// is bound into the action server-side — one differently-bound copy of
// this action per picker option (see ReferralFlow) — never a
// client-editable form field, so a colleague can't submit with an advisor
// other than the one they picked, and the advisor's internal id is never
// serialized to the browser (a bound Server Action reference is opaque to
// the client, unlike a hidden form field).
//
// Same security caveat as the rest of this app (see README "Security
// model" and src/lib/actions/portal.ts): RLS is disabled project-wide, so
// this only guards what the app's own UI exposes, not direct Supabase REST
// API access.
// ---------------------------------------------------------------------------

export type ReferralSubmitState = {
  error?: string;
  success?: { referralId: string };
};

export async function submitReferral(
  advisorId: string | null,
  advisorName: string | null,
  _prevState: ReferralSubmitState,
  formData: FormData,
): Promise<ReferralSubmitState> {
  const participantEng = formData.get("participant_eng")?.toString().trim() ?? "";
  const businessIdea = formData.get("business_idea")?.toString().trim() ?? "";

  if (!participantEng || !businessIdea) {
    return { error: "Please fill in all fields." };
  }

  const supabase = await createClient();
  const { data: referral, error } = await supabase
    .from("referrals")
    .insert({
      advisor_id: advisorId,
      advisor_name: advisorName,
      participant_eng: participantEng,
      business_idea: businessIdea,
    })
    .select("id")
    .single();

  if (error || !referral) {
    return { error: "Something went wrong — please try again." };
  }

  // No single recipient for a "No preference" referral (it sits in every
  // advisor's shared pool instead), so only notify when a specific
  // advisor was chosen.
  if (advisorId && advisorName) {
    await createNotification({
      type: "referral_submitted",
      title: `New referral: ENG ${participantEng}`,
      body: `A participant (ENG: ${participantEng}) was referred to ${advisorName} for Self Employment. Business idea: ${businessIdea}`,
      advisorId,
      relatedId: referral.id,
      dedupeKey: `referral_submitted:${referral.id}`,
    });
  }

  return { success: { referralId: referral.id } };
}

export type ReferralActionState = {
  error?: string;
  duplicateOf?: { participantId: string; participantName: string; advisorName: string };
};

// Reject — status only, nothing else changes. The referral is never deleted.
export async function rejectReferral(referralId: string, advisorId: string): Promise<ReferralActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({ status: "rejected", rejected_at: new Date().toISOString() })
    .eq("id", referralId)
    .eq("status", "new");

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/advisors/${advisorId}/referrals`);
  return {};
}

// Accept — reuses the same participant-creation shape as the existing "Add
// participant" flow (src/app/advisors/[advisorId]/participants/actions.ts):
// same required columns, same business_plans row created alongside it.
// If participant_eng already matches an existing participant's
// external_participant_id, no new participant is created — the referral
// is linked to the existing one instead, and the caller is told which
// advisor already owns them (no automatic caseload move — that stays the
// existing admin-only Transfer tool's job).
export async function acceptReferral(referralId: string, advisorId: string): Promise<ReferralActionState> {
  const supabase = await createClient();

  const { data: referral } = await supabase
    .from("referrals")
    .select("*")
    .eq("id", referralId)
    .eq("status", "new")
    .maybeSingle();

  if (!referral) {
    return { error: "This referral has already been actioned." };
  }

  const existing = await findParticipantByExternalId(referral.participant_eng);

  let participantId: string;

  if (existing) {
    participantId = existing.id;
  } else {
    const { data: participant, error: insertError } = await supabase
      .from("participants")
      .insert({
        advisor_id: advisorId,
        // The external form no longer collects a participant name — fall
        // back to the ENG reference so ptp_name (NOT NULL) is always
        // populated; the advisor can rename via the existing Edit
        // Participant page once they know who this is.
        ptp_name: referral.participant_name ?? referral.participant_eng,
        external_participant_id: referral.participant_eng,
        business_name: referral.business_idea.slice(0, 200),
        scheme_start_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    if (insertError || !participant) {
      return {
        error: insertError?.message.includes("duplicate")
          ? "That Participant ENG is already in use by another participant."
          : (insertError?.message ?? "Failed to create participant."),
      };
    }

    participantId = participant.id;
    await supabase.from("business_plans").insert({ participant_id: participantId, status: "Not Started" });
  }

  const { error: updateError } = await supabase
    .from("referrals")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_participant_id: participantId,
    })
    .eq("id", referralId)
    .eq("status", "new");

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/advisors/${advisorId}/referrals`);
  revalidatePath(`/advisors/${advisorId}/participants`);

  return existing ? { duplicateOf: { participantId: existing.id, participantName: existing.ptp_name, advisorName: existing.advisor_name } } : {};
}
