import { createClient } from "@/lib/supabase/server";
import type { IncomeTrackerEntry, IwtReview, OutcomeRecord, TradingStart, TradingStartReason } from "@/types/database";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import {
  computeGseOutcomeProgress,
  computeMonetaryOutcomeProgress,
  evaluateTradingStartEligibility,
  isDeclarationMissing,
  isReviewOverdue,
  type GseOutcomeProgress,
  type MonetaryOutcomeProgress,
} from "@/lib/trading-start-rules";
import { computeParticipantHealth, type ParticipantHealth } from "@/lib/participant-health";

function isThisMonth(dateStr: string, now: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ---------------------------------------------------------------------------
// Trading Start Intelligence — Active participants auto-detected as eligible
// for an NGSE Trading Start (two-month average net profit at/above the
// configured threshold).
// ---------------------------------------------------------------------------
export type TsIntelligenceRow = {
  participantId: string;
  participantName: string;
  advisorName: string;
  month1: string;
  month2: string;
  month1NetProfit: number;
  month2NetProfit: number;
  dateEligible: string;
};

// GSE / Claim Closed eligibility doesn't have a month-pair shape — a simple
// reason + detail row is enough for the queue and the work list.
export type SimpleEligibleRow = {
  participantId: string;
  participantName: string;
  reason: TradingStartReason;
  detail: string;
};

// ---------------------------------------------------------------------------
// Outcome Intelligence — every IWT participant's live progress towards their
// outcome, plus their health indicator.
// ---------------------------------------------------------------------------
export type OutcomeIntelligenceRow = {
  tradingStart: TradingStart;
  participantId: string;
  participantName: string;
  monetary: MonetaryOutcomeProgress | null;
  gse: GseOutcomeProgress | null;
  health: ParticipantHealth;
  isOutcomeReady: boolean;
};

// ---------------------------------------------------------------------------
// Today's Work — a single sorted queue of everything that needs action.
// ---------------------------------------------------------------------------
export type WorkQueueItemType =
  | "review_overdue"
  | "declaration_missing"
  | "approaching_deadline"
  | "outcome_ready"
  | "eligible_for_ts";

const URGENCY: Record<WorkQueueItemType, number> = {
  review_overdue: 1,
  declaration_missing: 2,
  approaching_deadline: 3,
  outcome_ready: 4,
  eligible_for_ts: 5,
};

export type WorkQueueItem = {
  type: WorkQueueItemType;
  urgency: number;
  participantId: string;
  participantName: string;
  label: string;
  detail: string;
};

export type SelfEmploymentDashboard = {
  activeParticipants: number;
  tradingStartsThisMonth: number;
  participantsInIwt: number;
  outcomesThisMonth: number;
  eligibleForTradingStart: number;
  participantsNearOutcome: number;
  participantsAtRisk: number;
  // Distinct labels for the same concepts, per spec — in this architecture a
  // Trading Start transfers straight into IWT, so "pending" (awaiting
  // advisor confirmation) and "active" (live, no Outcome yet) map onto the
  // eligibility queue and the IWT caseload respectively.
  pendingTradingStarts: number;
  activeTradingStarts: number;
  tsIntelligence: TsIntelligenceRow[];
  gseClaimEligible: SimpleEligibleRow[];
  outcomeIntelligence: OutcomeIntelligenceRow[];
  workQueue: WorkQueueItem[];
  // Advisor performance (all-time, attributed to this advisor as the
  // original advisor — see trading_starts.original_advisor_id).
  tradingStartsAchieved: number;
  outcomesAchieved: number;
  actionsToday: number;
};

function isNearOutcome(row: OutcomeIntelligenceRow): boolean {
  if (row.isOutcomeReady) return false;
  if (row.monetary) return row.monetary.percentComplete >= 80;
  if (row.gse) return row.gse.monthsRemaining <= 1;
  return false;
}

export async function getSelfEmploymentDashboard(
  advisorId: string,
  advisorName: string,
): Promise<SelfEmploymentDashboard> {
  const supabase = await createClient();
  const now = new Date();
  const settings = await getProgrammeSettings();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, ptp_name, status, is_gse, claim_closed")
    .eq("advisor_id", advisorId);

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);
  const participantNameById = new Map(rows.map((p) => [p.id, p.ptp_name]));

  const [{ data: incomeEntries }, { data: caseloadTradingStarts }, { data: originalTradingStarts }] =
    await Promise.all([
      participantIds.length
        ? supabase.from("income_tracker_entries").select("*").in("participant_id", participantIds)
        : Promise.resolve({ data: [] as IncomeTrackerEntry[] }),
      participantIds.length
        ? supabase.from("trading_starts").select("*").in("participant_id", participantIds)
        : Promise.resolve({ data: [] as TradingStart[] }),
      supabase.from("trading_starts").select("*").eq("original_advisor_id", advisorId),
    ]);

  const entriesByParticipant = new Map<string, IncomeTrackerEntry[]>();
  (incomeEntries ?? []).forEach((e) => {
    const list = entriesByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    entriesByParticipant.set(e.participant_id, list);
  });

  const caseloadTsIds = (caseloadTradingStarts ?? []).map((ts) => ts.id);
  const [{ data: reviewsAll }, { data: outcomesForCaseload }] = caseloadTsIds.length
    ? await Promise.all([
        supabase
          .from("iwt_reviews")
          .select("*")
          .in("trading_start_id", caseloadTsIds)
          .order("review_date", { ascending: false }),
        supabase.from("outcome_records").select("*").in("trading_start_id", caseloadTsIds),
      ])
    : [{ data: [] as IwtReview[] }, { data: [] as OutcomeRecord[] }];

  const originalTsIds = (originalTradingStarts ?? []).map((ts) => ts.id);
  const { data: outcomesForOriginal } = originalTsIds.length
    ? await supabase.from("outcome_records").select("*").in("trading_start_id", originalTsIds)
    : { data: [] as OutcomeRecord[] };

  const reviewsByTsId = new Map<string, IwtReview[]>();
  (reviewsAll ?? []).forEach((r) => {
    const list = reviewsByTsId.get(r.trading_start_id) ?? [];
    list.push(r);
    reviewsByTsId.set(r.trading_start_id, list);
  });

  const outcomeByTsId = new Map((outcomesForCaseload ?? []).map((o) => [o.trading_start_id, o]));
  const activeTradingStarts = (caseloadTradingStarts ?? []).filter((ts) => !outcomeByTsId.has(ts.id));

  // ---- Outcome Intelligence + health, for the current caseload's active IWT ----
  const outcomeIntelligence: OutcomeIntelligenceRow[] = activeTradingStarts.map((ts) => {
    const entries = entriesByParticipant.get(ts.participant_id) ?? [];
    const reviews = reviewsByTsId.get(ts.id) ?? [];
    const isMonetary = ts.reason !== "GSE";
    const monetary = isMonetary
      ? computeMonetaryOutcomeProgress(ts.trading_start_date, entries, settings, now)
      : null;
    const gse = !isMonetary ? computeGseOutcomeProgress(ts.trading_start_date, settings, now) : null;
    const health = computeParticipantHealth(ts, entries, reviews, settings, now);
    const isOutcomeReady = monetary?.isAchieved || gse?.readyToConfirm || false;

    return {
      tradingStart: ts,
      participantId: ts.participant_id,
      participantName: participantNameById.get(ts.participant_id) ?? "Unknown",
      monetary,
      gse,
      health,
      isOutcomeReady,
    };
  });

  // ---- Trading Start Intelligence: Active participants with no Trading Start yet ----
  const activeParticipantsWithoutTs = rows.filter((p) => p.status === "Active");
  const tsIntelligence: TsIntelligenceRow[] = [];
  const gseClaimEligible: SimpleEligibleRow[] = [];

  for (const p of activeParticipantsWithoutTs) {
    const results = evaluateTradingStartEligibility({
      participant: p,
      entries: entriesByParticipant.get(p.id) ?? [],
      settings,
    });

    const ngse = results.find((r) => r.reason === "NGSE" && r.eligible);
    if (ngse?.ngse) {
      tsIntelligence.push({
        participantId: p.id,
        participantName: p.ptp_name,
        advisorName,
        month1: ngse.ngse.month1!,
        month2: ngse.ngse.month2!,
        month1NetProfit: ngse.ngse.month1NetProfit ?? 0,
        month2NetProfit: ngse.ngse.month2NetProfit ?? 0,
        dateEligible: ngse.ngse.dateEligible ?? "",
      });
    }

    for (const result of results) {
      if (result.reason !== "NGSE" && result.eligible) {
        gseClaimEligible.push({
          participantId: p.id,
          participantName: p.ptp_name,
          reason: result.reason,
          detail: result.detail,
        });
      }
    }
  }

  // ---- Today's Work queue ----
  const workQueue: WorkQueueItem[] = [];

  for (const row of tsIntelligence) {
    workQueue.push({
      type: "eligible_for_ts",
      urgency: URGENCY.eligible_for_ts,
      participantId: row.participantId,
      participantName: row.participantName,
      label: "Eligible for Trading Start",
      detail: `Two-month average net profit at or above £${settings.ngse_average_threshold.toLocaleString("en-GB")} (${row.month1} and ${row.month2}).`,
    });
  }
  for (const row of gseClaimEligible) {
    workQueue.push({
      type: "eligible_for_ts",
      urgency: URGENCY.eligible_for_ts,
      participantId: row.participantId,
      participantName: row.participantName,
      label: "Eligible for Trading Start",
      detail: row.detail,
    });
  }

  for (const row of outcomeIntelligence) {
    const latestReview = reviewsByTsId.get(row.tradingStart.id)?.[0] ?? null;
    if (isReviewOverdue(latestReview?.next_review_date ?? null, now)) {
      workQueue.push({
        type: "review_overdue",
        urgency: URGENCY.review_overdue,
        participantId: row.participantId,
        participantName: row.participantName,
        label: "IWT review overdue",
        detail: `Next review was due ${new Date(latestReview!.next_review_date!).toLocaleDateString("en-GB")}.`,
      });
    }

    if (isDeclarationMissing(entriesByParticipant.get(row.participantId) ?? [], row.tradingStart.trading_start_date, now)) {
      workQueue.push({
        type: "declaration_missing",
        urgency: URGENCY.declaration_missing,
        participantId: row.participantId,
        participantName: row.participantName,
        label: "Income declaration missing",
        detail: "No Income Tracker entry received for last month.",
      });
    }

    if (row.isOutcomeReady) {
      workQueue.push({
        type: "outcome_ready",
        urgency: URGENCY.outcome_ready,
        participantId: row.participantId,
        participantName: row.participantName,
        label: "Outcome ready to process",
        detail: row.monetary
          ? `Cumulative net profit has reached £${settings.outcome_target.toLocaleString("en-GB")} within ${settings.outcome_period_months} months.`
          : `The full ${settings.gse_outcome_period_months}-month gainful period is complete.`,
      });
    } else if (row.monetary && !row.monetary.isOverdue && row.monetary.monthsRemaining <= 1) {
      workQueue.push({
        type: "approaching_deadline",
        urgency: URGENCY.approaching_deadline,
        participantId: row.participantId,
        participantName: row.participantName,
        label: "Approaching Outcome deadline",
        detail: `${row.monetary.monthsRemaining} month(s) left to reach £${settings.outcome_target.toLocaleString("en-GB")} (currently ${row.monetary.percentComplete}%).`,
      });
    } else if (row.gse && !row.gse.readyToConfirm && row.gse.monthsRemaining <= 1) {
      workQueue.push({
        type: "approaching_deadline",
        urgency: URGENCY.approaching_deadline,
        participantId: row.participantId,
        participantName: row.participantName,
        label: "Approaching Outcome deadline",
        detail: `${row.gse.monthsRemaining} month(s) left in the gainful period.`,
      });
    }
  }

  workQueue.sort((a, b) => a.urgency - b.urgency || a.participantName.localeCompare(b.participantName));

  const tradingStartsThisMonth = (originalTradingStarts ?? []).filter((ts) =>
    isThisMonth(ts.trading_start_date, now),
  ).length;

  const outcomesThisMonth = [...(outcomesForCaseload ?? []), ...(outcomesForOriginal ?? [])].filter(
    (o, index, all) => all.findIndex((x) => x.id === o.id) === index && isThisMonth(o.outcome_date, now),
  ).length;

  const eligibleForTradingStart = tsIntelligence.length + gseClaimEligible.length;

  return {
    activeParticipants: rows.filter((p) => p.status === "Active").length,
    tradingStartsThisMonth,
    participantsInIwt: activeTradingStarts.length,
    outcomesThisMonth,
    eligibleForTradingStart,
    participantsNearOutcome: outcomeIntelligence.filter(isNearOutcome).length,
    participantsAtRisk: outcomeIntelligence.filter((r) => r.health.tone === "red").length,
    pendingTradingStarts: eligibleForTradingStart,
    activeTradingStarts: activeTradingStarts.length,
    tsIntelligence,
    gseClaimEligible,
    outcomeIntelligence,
    workQueue,
    tradingStartsAchieved: (originalTradingStarts ?? []).length,
    outcomesAchieved: (outcomesForOriginal ?? []).filter((o) => o.outcome_achieved).length,
    actionsToday: workQueue.length,
  };
}
