"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NotificationType, ParticipantStatus, TradingStartReason } from "@/types/database";
import {
  createNotification,
  resolveNotificationByRelatedId,
  resolveNotificationsForParticipant,
} from "@/lib/data/notifications";

const TS_ELIGIBILITY_NOTIFICATION_TYPES: NotificationType[] = [
  "trading_start_eligible_gse",
  "trading_start_eligible_ngse",
  "trading_start_eligible_claim_closed",
];

export type TradingStartFormState = {
  error?: string;
};

function revalidateParticipant() {
  revalidatePath("/advisors/[advisorId]", "layout");
}

async function getAdvisorName(supabase: Awaited<ReturnType<typeof createClient>>, advisorId: string) {
  const { data } = await supabase.from("advisors").select("full_name").eq("id", advisorId).maybeSingle();
  return data?.full_name ?? "Unknown advisor";
}

async function logStatusChange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  participantId: string,
  fromStatus: ParticipantStatus | null,
  toStatus: ParticipantStatus,
  changedBy: string,
  notes?: string | null,
) {
  await supabase.from("participant_status_history").insert({
    participant_id: participantId,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by: changedBy,
    notes: notes ?? null,
  });
}

// ---------------------------------------------------------------------------
// Manual status change — for Referral / Active / Closed transitions that
// don't go through a dedicated Trading Start / Outcome workflow.
// ---------------------------------------------------------------------------
export async function setParticipantStatus(
  participantId: string,
  advisorId: string,
  _prevState: TradingStartFormState,
  formData: FormData,
): Promise<TradingStartFormState> {
  const newStatus = formData.get("status")?.toString() as ParticipantStatus | undefined;
  if (!newStatus) {
    return { error: "Select a status." };
  }

  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("status")
    .eq("id", participantId)
    .maybeSingle();

  const { error } = await supabase
    .from("participants")
    .update({ status: newStatus })
    .eq("id", participantId);

  if (error) {
    return { error: error.message };
  }

  const advisorName = await getAdvisorName(supabase, advisorId);
  await logStatusChange(supabase, participantId, participant?.status ?? null, newStatus, advisorName);

  revalidateParticipant();
  return {};
}

// ---------------------------------------------------------------------------
// Create Trading Start — always a manual, advisor-confirmed action, even
// when the participant was auto-flagged as eligible (GSE / NGSE two
// qualifying months / Claim Closed). Never creates a duplicate: if this
// participant already has an active Trading Start (no Outcome recorded
// yet), it's updated in place instead of inserting a second row.
// ---------------------------------------------------------------------------
export async function createTradingStart(
  participantId: string,
  advisorId: string,
  _prevState: TradingStartFormState,
  formData: FormData,
): Promise<TradingStartFormState> {
  const tradingStartDate = formData.get("trading_start_date")?.toString() ?? "";
  const reason = formData.get("reason")?.toString() as TradingStartReason | undefined;
  const iwtAdvisorId = formData.get("iwt_advisor_id")?.toString() ?? "";
  const transferDate = formData.get("transfer_date")?.toString() || tradingStartDate;
  const evidenceNotes = formData.get("evidence_notes")?.toString().trim() || null;

  if (!tradingStartDate || !reason || !iwtAdvisorId) {
    return { error: "Trading start date, reason and IWT advisor are required." };
  }

  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("ptp_name, advisor_id, status")
    .eq("id", participantId)
    .maybeSingle();

  if (!participant) {
    return { error: "Participant not found." };
  }

  const originalAdvisorId = participant.advisor_id;

  const { data: existingTradingStarts } = await supabase
    .from("trading_starts")
    .select("id")
    .eq("participant_id", participantId)
    .order("created_at", { ascending: false });

  let activeTradingStartId: string | null = null;
  if (existingTradingStarts && existingTradingStarts.length > 0) {
    const ids = existingTradingStarts.map((t) => t.id);
    const { data: outcomes } = await supabase
      .from("outcome_records")
      .select("trading_start_id")
      .in("trading_start_id", ids);
    const outcomeTsIds = new Set((outcomes ?? []).map((o) => o.trading_start_id));
    activeTradingStartId = existingTradingStarts.find((t) => !outcomeTsIds.has(t.id))?.id ?? null;
  }

  let tradingStartId = activeTradingStartId;

  if (activeTradingStartId) {
    const { error } = await supabase
      .from("trading_starts")
      .update({
        trading_start_date: tradingStartDate,
        reason,
        iwt_advisor_id: iwtAdvisorId,
        transfer_date: transferDate,
        evidence_notes: evidenceNotes,
      })
      .eq("id", activeTradingStartId);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { data: tradingStart, error } = await supabase
      .from("trading_starts")
      .insert({
        participant_id: participantId,
        trading_start_date: tradingStartDate,
        reason,
        original_advisor_id: originalAdvisorId,
        iwt_advisor_id: iwtAdvisorId,
        transfer_date: transferDate,
        evidence_notes: evidenceNotes,
      })
      .select("id")
      .single();

    if (error || !tradingStart) {
      return { error: error?.message ?? "Failed to create the Trading Start." };
    }
    tradingStartId = tradingStart.id;
  }

  // A Trading Start being recorded is exactly what every eligibility
  // notification for this participant was asking the advisor to do —
  // resolve all of them at once, regardless of which rule(s) had matched.
  await resolveNotificationsForParticipant(participantId, TS_ELIGIBILITY_NOTIFICATION_TYPES, "System (Trading Start recorded)");

  // Move the participant into the IWT advisor's caseload, exactly like a
  // normal Transfer Participant, so their office follows automatically and
  // the move is captured in the same audit log.
  if (iwtAdvisorId !== originalAdvisorId) {
    const [{ data: fromAdvisor }, { data: toAdvisor }] = await Promise.all([
      supabase.from("advisors").select("office_id").eq("id", originalAdvisorId).maybeSingle(),
      supabase.from("advisors").select("office_id").eq("id", iwtAdvisorId).maybeSingle(),
    ]);

    if (!toAdvisor) {
      return { error: "IWT advisor could not be found." };
    }

    await supabase.from("participants").update({ advisor_id: iwtAdvisorId }).eq("id", participantId);

    await supabase.from("participant_transfers").insert({
      participant_id: participantId,
      from_advisor_id: originalAdvisorId,
      to_advisor_id: iwtAdvisorId,
      from_office_id: fromAdvisor?.office_id ?? null,
      to_office_id: toAdvisor.office_id,
      transferred_by: "Trading Start",
      notes: `Automatic transfer to IWT advisor on Trading Start (${reason}).`,
    });

    if (tradingStartId) {
      await createNotification({
        type: "transferred_to_iwt",
        title: `${participant.ptp_name} transferred to your IWT caseload`,
        body: `Participant ${participant.ptp_name} has been transferred to In Work Tracking under your caseload following their Trading Start (${reason}).`,
        participantId,
        advisorId: iwtAdvisorId,
        relatedId: tradingStartId,
        dedupeKey: `transferred_to_iwt:${tradingStartId}`,
      });
    }
  }

  const advisorName = await getAdvisorName(supabase, advisorId);

  // Record both transitions the spec describes: momentarily "Trading Start",
  // then immediately "In Work Tracking" — the ongoing state for the rest of
  // this workflow. Skipped if this participant is already past that point
  // (e.g. updating an existing active Trading Start's details).
  if (participant.status !== "In Work Tracking") {
    await supabase.from("participants").update({ status: "Trading Start" }).eq("id", participantId);
    await logStatusChange(supabase, participantId, participant.status, "Trading Start", advisorName, `Trading Start ${activeTradingStartId ? "updated" : "created"} (${reason}).`);

    await supabase.from("participants").update({ status: "In Work Tracking" }).eq("id", participantId);
    await logStatusChange(supabase, participantId, "Trading Start", "In Work Tracking", advisorName);
  }

  revalidateParticipant();
  return {};
}

// ---------------------------------------------------------------------------
// GSE / Claim Closed markers — simple, advisor-triggered assertions that
// feed the Trading Start eligibility engine. Kept separate from the
// generic participant status field.
// ---------------------------------------------------------------------------
export async function markAsGse(participantId: string, advisorId: string) {
  const supabase = await createClient();
  const advisorName = await getAdvisorName(supabase, advisorId);

  await supabase
    .from("participants")
    .update({ is_gse: true, gse_marked_at: new Date().toISOString(), gse_marked_by: advisorName })
    .eq("id", participantId);

  revalidateParticipant();
}

export async function closeClaim(participantId: string, advisorId: string) {
  const supabase = await createClient();
  const advisorName = await getAdvisorName(supabase, advisorId);

  await supabase
    .from("participants")
    .update({ claim_closed: true, claim_closed_at: new Date().toISOString(), claim_closed_by: advisorName })
    .eq("id", participantId);

  revalidateParticipant();
}

// ---------------------------------------------------------------------------
// IWT Reviews
// ---------------------------------------------------------------------------
export async function addIwtReview(
  tradingStartId: string,
  advisorId: string,
  _prevState: TradingStartFormState,
  formData: FormData,
): Promise<TradingStartFormState> {
  const reviewDate = formData.get("review_date")?.toString() ?? "";
  const nextReviewDate = formData.get("next_review_date")?.toString() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!reviewDate) {
    return { error: "Review date is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("iwt_reviews").insert({
    trading_start_id: tradingStartId,
    review_date: reviewDate,
    next_review_date: nextReviewDate,
    notes,
    reviewed_by_advisor_id: advisorId,
  });

  if (error) {
    return { error: error.message };
  }

  // A new review has just been logged, so any "review due soon / overdue"
  // reminder pointing at the previous next_review_date is stale — the lazy
  // sync (src/lib/data/notification-rules.ts) will create a fresh one next
  // time it runs if the new next_review_date is itself within the window.
  const reviewingAdvisorName = await getAdvisorName(supabase, advisorId);
  await resolveNotificationByRelatedId(tradingStartId, "upcoming_review", `${reviewingAdvisorName} (review logged)`);

  revalidateParticipant();
  return {};
}

// ---------------------------------------------------------------------------
// Outcome
// ---------------------------------------------------------------------------
export async function recordOutcome(
  tradingStartId: string,
  participantId: string,
  advisorId: string,
  _prevState: TradingStartFormState,
  formData: FormData,
): Promise<TradingStartFormState> {
  const outcomeDate = formData.get("outcome_date")?.toString() ?? "";
  const outcomeType = formData.get("outcome_type")?.toString() as TradingStartReason | undefined;
  const outcomeAchieved = formData.get("outcome_achieved")?.toString() === "yes";
  const evidence = formData.get("evidence")?.toString().trim() || null;
  const advisorNotes = formData.get("advisor_notes")?.toString().trim() || null;

  if (!outcomeDate || !outcomeType) {
    return { error: "Outcome date and outcome type are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("outcome_records").upsert(
    {
      trading_start_id: tradingStartId,
      outcome_date: outcomeDate,
      outcome_type: outcomeType,
      outcome_achieved: outcomeAchieved,
      evidence,
      advisor_notes: advisorNotes,
    },
    { onConflict: "trading_start_id" },
  );

  if (error) {
    return { error: error.message };
  }

  const [{ data: participant }, { data: tradingStart }] = await Promise.all([
    supabase.from("participants").select("ptp_name, status").eq("id", participantId).maybeSingle(),
    supabase.from("trading_starts").select("original_advisor_id").eq("id", tradingStartId).maybeSingle(),
  ]);

  if (outcomeAchieved && participant && tradingStart?.original_advisor_id) {
    await createNotification({
      type: "outcome_achieved",
      title: `${participant.ptp_name} achieved their Outcome`,
      body: `Participant ${participant.ptp_name} has met the criteria for a ${outcomeType} Outcome, recorded ${new Date(outcomeDate).toLocaleDateString("en-GB")}.`,
      participantId,
      advisorId: tradingStart.original_advisor_id,
      relatedId: tradingStartId,
      dedupeKey: `outcome_achieved:${tradingStartId}`,
    });
  }

  const newStatus: ParticipantStatus = outcomeAchieved ? "Outcome Achieved" : "Closed";
  await supabase.from("participants").update({ status: newStatus }).eq("id", participantId);

  const advisorName = await getAdvisorName(supabase, advisorId);
  await logStatusChange(
    supabase,
    participantId,
    participant?.status ?? null,
    newStatus,
    advisorName,
    outcomeAchieved ? "Outcome achieved." : "Outcome not achieved — case closed.",
  );

  revalidateParticipant();
  return {};
}
