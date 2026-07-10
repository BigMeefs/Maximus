import { createClient } from "@/lib/supabase/server";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import { evaluateTradingStartEligibility, isReviewOverdue } from "@/lib/trading-start-rules";
import { ACTIVE_NOTIFICATION_STATUSES, type NotificationType } from "@/types/database";
import type { Appointment, IncomeTrackerEntry, IwtReview, Participant, TradingStart } from "@/types/database";

// ---------------------------------------------------------------------------
// Lazy/computed notifications — the ones that represent an ongoing
// condition ("this participant is eligible", "this participant needs
// contact") rather than a one-off event. There's no background job in this
// deployment (see README "Notifications"), so these are (re)computed
// whenever an advisor opens their Dashboard or Notifications page, and
// reconciled against whatever's already active: anything newly true gets
// created, anything no longer true gets auto-resolved. Event-driven
// notifications (income submitted, funding decided, transfers, outcomes)
// are NOT handled here — they're created directly inside the server action
// that causes them (see actions/portal.ts, actions/funding.ts,
// actions/trading-start.ts, actions/appointments.ts).
// ---------------------------------------------------------------------------

const UPCOMING_REVIEW_WINDOW_DAYS = 7;

export const LAZY_NOTIFICATION_TYPES: NotificationType[] = [
  "trading_start_eligible_gse",
  "trading_start_eligible_ngse",
  "trading_start_eligible_claim_closed",
  "upcoming_review",
];

type Candidate = {
  type: NotificationType;
  dedupeKey: string;
  participantId: string;
  relatedId?: string | null;
  title: string;
  body: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (1000 * 60 * 60 * 24));
}

function tsEligibleType(reason: string): NotificationType {
  if (reason === "NGSE") return "trading_start_eligible_ngse";
  if (reason === "GSE") return "trading_start_eligible_gse";
  return "trading_start_eligible_claim_closed";
}

function tsEligibleLabel(reason: string): string {
  if (reason === "NGSE") return "NGSE";
  if (reason === "GSE") return "GSE";
  return "Claim Closed";
}

export async function syncAutoNotificationsForAdvisor(advisorId: string): Promise<void> {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [{ data: participantRows }, settings] = await Promise.all([
    supabase.from("participants").select("*").eq("advisor_id", advisorId),
    getProgrammeSettings(),
  ]);

  const participants = (participantRows ?? []) as Participant[];
  const candidates = new Map<string, Candidate>();

  if (participants.length > 0) {
    const participantIds = participants.map((p) => p.id);
    const participantById = new Map(participants.map((p) => [p.id, p]));
    const activeParticipants = participants.filter((p) => p.status === "Active");
    const activeIds = activeParticipants.map((p) => p.id);

    const [{ data: entryRows }, { data: appointmentRows }, { data: tradingStartRows }] = await Promise.all([
      activeIds.length
        ? supabase.from("income_tracker_entries").select("*").in("participant_id", activeIds)
        : Promise.resolve({ data: [] as IncomeTrackerEntry[] }),
      supabase.from("appointments").select("*").in("participant_id", participantIds),
      supabase.from("trading_starts").select("*").in("participant_id", participantIds),
    ]);

    const entriesByParticipant = new Map<string, IncomeTrackerEntry[]>();
    (entryRows ?? []).forEach((e) => {
      const list = entriesByParticipant.get(e.participant_id) ?? [];
      list.push(e);
      entriesByParticipant.set(e.participant_id, list);
    });

    const appointmentsByParticipant = new Map<string, Appointment[]>();
    (appointmentRows ?? []).forEach((a) => {
      const list = appointmentsByParticipant.get(a.participant_id) ?? [];
      list.push(a);
      appointmentsByParticipant.set(a.participant_id, list);
    });

    // ---- Trading Start eligibility (Active participants only) ----
    for (const p of activeParticipants) {
      const results = evaluateTradingStartEligibility({
        participant: p,
        entries: entriesByParticipant.get(p.id) ?? [],
        settings,
      });
      for (const result of results) {
        if (!result.eligible) continue;
        const type = tsEligibleType(result.reason);
        const dedupeKey = `${type}:${p.id}`;
        candidates.set(dedupeKey, {
          type,
          dedupeKey,
          participantId: p.id,
          title: `${p.ptp_name} is eligible for a ${tsEligibleLabel(result.reason)} Trading Start`,
          body: `Participant ${p.ptp_name} is now eligible for a ${tsEligibleLabel(result.reason)} Trading Start. Review and process the Trading Start.`,
        });
      }
    }

    // ---- Upcoming appointments (any participant, within the reminder window) ----
    for (const p of participants) {
      const appts = appointmentsByParticipant.get(p.id) ?? [];
      const next = appts
        .filter((a) => a.appointment_date >= today && daysBetween(today, a.appointment_date) <= UPCOMING_REVIEW_WINDOW_DAYS)
        .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];
      if (next) {
        const dedupeKey = `upcoming_review_appt:${next.id}`;
        candidates.set(dedupeKey, {
          type: "upcoming_review",
          dedupeKey,
          participantId: p.id,
          relatedId: next.id,
          title: `Upcoming appointment with ${p.ptp_name}`,
          body: `Appointment with ${p.ptp_name} is scheduled for ${new Date(next.appointment_date).toLocaleDateString("en-GB")}.`,
        });
      }
    }

    // ---- Upcoming / overdue IWT reviews (trading starts this advisor tracks, no Outcome recorded yet) ----
    const iwtTradingStarts = (tradingStartRows ?? []).filter((ts) => ts.iwt_advisor_id === advisorId) as TradingStart[];
    const iwtTsIds = iwtTradingStarts.map((ts) => ts.id);
    if (iwtTsIds.length > 0) {
      const [{ data: reviewRows }, { data: outcomeRows }] = await Promise.all([
        supabase.from("iwt_reviews").select("*").in("trading_start_id", iwtTsIds).order("review_date", { ascending: false }),
        supabase.from("outcome_records").select("trading_start_id").in("trading_start_id", iwtTsIds),
      ]);

      const latestReviewByTsId = new Map<string, IwtReview>();
      (reviewRows ?? []).forEach((r) => {
        if (!latestReviewByTsId.has(r.trading_start_id)) latestReviewByTsId.set(r.trading_start_id, r);
      });
      const tsIdsWithOutcome = new Set((outcomeRows ?? []).map((o) => o.trading_start_id));

      for (const ts of iwtTradingStarts) {
        if (tsIdsWithOutcome.has(ts.id)) continue;
        const nextReviewDate = latestReviewByTsId.get(ts.id)?.next_review_date ?? null;
        if (!nextReviewDate) continue;
        const overdue = isReviewOverdue(nextReviewDate, now);
        const withinWindow = daysBetween(today, nextReviewDate) <= UPCOMING_REVIEW_WINDOW_DAYS;
        if (!overdue && !withinWindow) continue;

        const participantName = participantById.get(ts.participant_id)?.ptp_name ?? "this participant";
        const dedupeKey = `upcoming_review_iwt:${ts.id}:${nextReviewDate}`;
        candidates.set(dedupeKey, {
          type: "upcoming_review",
          dedupeKey,
          participantId: ts.participant_id,
          relatedId: ts.id,
          title: overdue ? `IWT review overdue for ${participantName}` : `IWT review due soon for ${participantName}`,
          body: overdue
            ? `The IWT review for ${participantName} was due ${new Date(nextReviewDate).toLocaleDateString("en-GB")} and is now overdue.`
            : `The IWT review for ${participantName} is due ${new Date(nextReviewDate).toLocaleDateString("en-GB")}.`,
        });
      }
    }
  }

  await reconcile(supabase, advisorId, candidates);
}

// Diffs the freshly computed candidate set against whatever lazy-type
// notifications are currently active for this advisor: creates anything
// newly true, and auto-resolves (never deletes) anything that no longer is.
async function reconcile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advisorId: string,
  candidates: Map<string, Candidate>,
): Promise<void> {
  const { data: existingRows } = await supabase
    .from("notifications")
    .select("id, dedupe_key")
    .eq("advisor_id", advisorId)
    .in("status", ACTIVE_NOTIFICATION_STATUSES)
    .in("type", LAZY_NOTIFICATION_TYPES);

  const existingKeys = new Set((existingRows ?? []).map((r) => r.dedupe_key));
  const toInsert = [...candidates.values()].filter((c) => !existingKeys.has(c.dedupeKey));
  const staleIds = (existingRows ?? [])
    .filter((r) => r.dedupe_key && !candidates.has(r.dedupe_key))
    .map((r) => r.id);

  await Promise.all([
    toInsert.length
      ? supabase.from("notifications").insert(
          toInsert.map((c) => ({
            type: c.type,
            status: "Action Required",
            title: c.title,
            body: c.body,
            participant_id: c.participantId,
            advisor_id: advisorId,
            related_id: c.relatedId ?? null,
            dedupe_key: c.dedupeKey,
          })),
        )
      : Promise.resolve({ error: null }),
    staleIds.length
      ? supabase
          .from("notifications")
          .update({ status: "Reviewed", reviewed_by: "System (auto-resolved)", reviewed_at: new Date().toISOString() })
          .in("id", staleIds)
      : Promise.resolve({ error: null }),
  ]);
}
