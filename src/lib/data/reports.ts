import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { getGatewayChecklist } from "@/lib/business-rules";
import {
  evaluateTradingStartEligibility,
  getOutcomeDeadline,
  isReviewOverdue,
  outcomePeriodMonthsFor,
} from "@/lib/trading-start-rules";
import { computeParticipantHealth } from "@/lib/participant-health";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import { FUNDING_APPLICATION_STATUSES, TRADING_START_REASONS } from "@/types/database";
import type {
  BusinessPlan,
  BusinessStage,
  DigitalPresenceItem,
  EvidenceFile,
  FundingApplicationStatus,
  GainfulRecommendation,
  GatewayChecklistItem,
  HmrcBusinessInfo,
  IncomeTrackerEntry,
  IwtReview,
  Participant,
  RagStatus,
  TradingStartReason,
} from "@/types/database";

type Bucket = { label: string; count: number };

type PerformanceBucket = Bucket & { gatewayReady: number; gainfulReady: number };

export type MonthlyProgressPoint = {
  month: string;
  income: number;
  expenses: number;
};

export type ReportStats = {
  totalParticipants: number;
  byOffice: PerformanceBucket[];
  byAdvisor: (PerformanceBucket & { officeLabel: string })[];
  bySector: Bucket[];
  byRag: Bucket[];
  byStage: Bucket[];
  byGatewayStatus: Bucket[];
  byGainfulStatus: Bucket[];
  byFundingStatus: (Bucket & { totalRequested: number; totalApproved: number; totalReceived: number })[];
  fundingOutstanding: number;
  monthlyProgress: MonthlyProgressPoint[];
};

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function gatewayStatusLabel(percent: number): string {
  if (percent >= 100) return "Ready";
  if (percent > 0) return "In Progress";
  return "Not Started";
}

export async function getCompanyReportStats(): Promise<ReportStats> {
  const supabase = await createClient();

  const [
    advisors,
    { data: participants },
    { data: businessPlans },
    { data: hmrcRows },
    { data: digitalPresenceRows },
    { data: evidenceRows },
    { data: gatewayItemRows },
    { data: gainfulRows },
    { data: fundingRows },
    { data: monthlyEarningsRows },
  ] = await Promise.all([
    listAdvisors(),
    supabase.from("participants").select("*"),
    supabase.from("business_plans").select("*"),
    supabase.from("hmrc_business_info").select("*"),
    supabase.from("digital_presence_items").select("*"),
    supabase.from("evidence_files").select("*"),
    supabase.from("gateway_checklist_items").select("*"),
    supabase.from("gainful_assessments").select("*"),
    supabase.from("funding_records").select("*"),
    supabase.from("monthly_earnings").select("month, amount, expenses"),
  ]);

  const rows: Participant[] = participants ?? [];
  const advisorById = new Map(advisors.map((a) => [a.id, a]));

  const businessPlanByParticipant = new Map<string, BusinessPlan>(
    (businessPlans ?? []).map((bp) => [bp.participant_id, bp]),
  );
  const hmrcByParticipant = new Map<string, HmrcBusinessInfo>(
    (hmrcRows ?? []).map((h) => [h.participant_id, h]),
  );
  const digitalPresenceByParticipant = groupBy(
    (digitalPresenceRows ?? []) as DigitalPresenceItem[],
    (d) => d.participant_id,
  );
  const evidenceByParticipant = groupBy((evidenceRows ?? []) as EvidenceFile[], (e) => e.participant_id);
  const gatewayItemsByParticipant = groupBy(
    (gatewayItemRows ?? []) as GatewayChecklistItem[],
    (g) => g.participant_id,
  );
  const gainfulRecommendationByParticipant = new Map<string, GainfulRecommendation>(
    (gainfulRows ?? []).map((g) => [g.participant_id, g.overall_recommendation]),
  );

  const officeStats = new Map<string, { count: number; gatewayReady: number; gainfulReady: number }>();
  const advisorStats = new Map<string, { count: number; gatewayReady: number; gainfulReady: number }>();
  const sectorCounts = new Map<string, number>();
  const ragCounts = new Map<RagStatus, number>();
  const stageCounts = new Map<BusinessStage, number>();
  const gatewayCounts = new Map<string, number>();
  const gainfulCounts = new Map<GainfulRecommendation, number>();

  function bump(
    map: Map<string, { count: number; gatewayReady: number; gainfulReady: number }>,
    key: string,
    gatewayReady: boolean,
    gainfulReady: boolean,
  ) {
    const existing = map.get(key) ?? { count: 0, gatewayReady: 0, gainfulReady: 0 };
    existing.count += 1;
    if (gatewayReady) existing.gatewayReady += 1;
    if (gainfulReady) existing.gainfulReady += 1;
    map.set(key, existing);
  }

  for (const p of rows) {
    const advisor = advisorById.get(p.advisor_id);
    const officeLabel = advisor?.office_name ?? "Unknown office";

    const sector = p.business_sector || "Not specified";
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);

    ragCounts.set(p.rag_status, (ragCounts.get(p.rag_status) ?? 0) + 1);
    stageCounts.set(p.business_stage, (stageCounts.get(p.business_stage) ?? 0) + 1);

    const gateway = getGatewayChecklist({
      participant: p,
      businessPlan: businessPlanByParticipant.get(p.id) ?? null,
      hmrc: hmrcByParticipant.get(p.id) ?? null,
      digitalPresence: digitalPresenceByParticipant.get(p.id) ?? [],
      evidenceFiles: evidenceByParticipant.get(p.id) ?? [],
      manualItems: gatewayItemsByParticipant.get(p.id) ?? [],
    });
    const gatewayLabel = gatewayStatusLabel(gateway.percent);
    gatewayCounts.set(gatewayLabel, (gatewayCounts.get(gatewayLabel) ?? 0) + 1);

    const gainfulRecommendation = gainfulRecommendationByParticipant.get(p.id) ?? "Not Yet Ready";
    gainfulCounts.set(gainfulRecommendation, (gainfulCounts.get(gainfulRecommendation) ?? 0) + 1);

    const isGatewayReady = gatewayLabel === "Ready";
    const isGainfulReady = gainfulRecommendation === "Ready";
    bump(officeStats, officeLabel, isGatewayReady, isGainfulReady);
    bump(advisorStats, p.advisor_id, isGatewayReady, isGainfulReady);
  }

  const byOffice = [...officeStats.entries()]
    .map(([label, stats]) => ({ label, count: stats.count, gatewayReady: stats.gatewayReady, gainfulReady: stats.gainfulReady }))
    .sort((a, b) => b.count - a.count);

  const byAdvisor = [...advisorStats.entries()]
    .map(([advisorId, stats]) => {
      const advisor = advisorById.get(advisorId);
      return {
        label: advisor?.full_name ?? "Unknown advisor",
        officeLabel: advisor?.office_name ?? "Unknown office",
        count: stats.count,
        gatewayReady: stats.gatewayReady,
        gainfulReady: stats.gainfulReady,
      };
    })
    .sort((a, b) => b.count - a.count);

  const bySector = [...sectorCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const byRag = [...ragCounts.entries()].map(([label, count]) => ({ label, count }));
  const byStage = [...stageCounts.entries()].map(([label, count]) => ({ label, count }));
  const byGatewayStatus = ["Not Started", "In Progress", "Ready"].map((label) => ({
    label,
    count: gatewayCounts.get(label) ?? 0,
  }));
  const byGainfulStatus = (["Ready", "Needs Further Evidence", "Not Yet Ready"] as GainfulRecommendation[]).map(
    (label) => ({ label, count: gainfulCounts.get(label) ?? 0 }),
  );

  const fundingStatusTotals = new Map<
    FundingApplicationStatus,
    { count: number; totalRequested: number; totalApproved: number; totalReceived: number }
  >();
  for (const f of fundingRows ?? []) {
    const existing = fundingStatusTotals.get(f.application_status) ?? {
      count: 0,
      totalRequested: 0,
      totalApproved: 0,
      totalReceived: 0,
    };
    existing.count += 1;
    existing.totalRequested += Number(f.amount_requested) || 0;
    existing.totalApproved += Number(f.amount_approved) || 0;
    existing.totalReceived += Number(f.amount_received) || 0;
    fundingStatusTotals.set(f.application_status, existing);
  }

  const byFundingStatus = FUNDING_APPLICATION_STATUSES.map((label) => {
    const totals = fundingStatusTotals.get(label) ?? {
      count: 0,
      totalRequested: 0,
      totalApproved: 0,
      totalReceived: 0,
    };
    return { label, ...totals };
  });

  const fundingOutstanding = byFundingStatus.reduce(
    (sum, f) => sum + Math.max(0, f.totalApproved - f.totalReceived),
    0,
  );

  const monthlyTotals = new Map<string, { income: number; expenses: number }>();
  for (const e of monthlyEarningsRows ?? []) {
    const key = e.month.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { income: 0, expenses: 0 };
    existing.income += Number(e.amount) || 0;
    existing.expenses += Number(e.expenses) || 0;
    monthlyTotals.set(key, existing);
  }
  const monthlyProgress = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, totals]) => ({ month, ...totals }));

  return {
    totalParticipants: rows.length,
    byOffice,
    byAdvisor,
    bySector,
    byRag,
    byStage,
    fundingOutstanding,
    monthlyProgress,
    byGatewayStatus,
    byGainfulStatus,
    byFundingStatus,
  };
}

// ---------------------------------------------------------------------------
// Trading Start / IWT / Outcome reporting — company-wide, with original
// advisors retaining ownership of their Trading Start and outcome stats even
// after the participant transfers to an IWT advisor.
// ---------------------------------------------------------------------------
export type ReportDateRange = { from?: string; to?: string };

export type TradingStartAdvisorRow = {
  advisorId: string;
  label: string;
  officeLabel: string;
  tradingStarts: number;
  outcomesAchieved: number;
  outcomesNotAchieved: number;
  activeCaseload: number;
};

export type MonthlyTrendPoint = {
  month: string;
  tradingStarts: number;
  outcomes: number;
};

export type TradingStartReportStats = {
  totalTradingStarts: number;
  tradingStartsInPeriod: number;
  periodLabel: string;
  byReason: Bucket[];
  outcomesInPeriod: number;
  outcomesAchievedTotal: number;
  outcomesNotAchievedTotal: number;
  outcomeConversionRate: number;
  iwtCaseloadSize: number;
  avgDaysToTradingStart: number | null;
  avgDaysTradingStartToOutcome: number | null;
  approachingDeadline: number;
  overdueReviews: number;
  eligibleNotProcessed: number;
  participantsAtRisk: number;
  byAdvisor: TradingStartAdvisorRow[];
  monthlyTrends: MonthlyTrendPoint[];
};

function inRange(dateStr: string, range?: ReportDateRange): boolean {
  if (!range) return true;
  if (range.from && dateStr < range.from) return false;
  if (range.to && dateStr > range.to) return false;
  return true;
}

function isThisMonth(dateStr: string, now: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = new Date(fromDateStr);
  const to = new Date(toDateStr);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export async function getTradingStartReportStats(
  dateRange?: ReportDateRange,
): Promise<TradingStartReportStats> {
  const supabase = await createClient();

  const [advisors, { data: tradingStarts }, { data: outcomes }, { data: iwtReviews }, { data: participants }, { data: incomeEntries }, settings] =
    await Promise.all([
      listAdvisors(),
      supabase.from("trading_starts").select("*"),
      supabase.from("outcome_records").select("*"),
      supabase.from("iwt_reviews").select("*").order("review_date", { ascending: false }),
      supabase.from("participants").select("id, advisor_id, status, scheme_start_date, is_gse, claim_closed"),
      supabase.from("income_tracker_entries").select("*"),
      getProgrammeSettings(),
    ]);

  const now = new Date();
  const advisorById = new Map(advisors.map((a) => [a.id, a]));
  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));
  const tsById = new Map((tradingStarts ?? []).map((ts) => [ts.id, ts]));
  const outcomeByTsId = new Map((outcomes ?? []).map((o) => [o.trading_start_id, o]));

  const periodRange: ReportDateRange | undefined = dateRange?.from || dateRange?.to ? dateRange : undefined;
  const periodTradingStarts = (tradingStarts ?? []).filter((ts) =>
    periodRange ? inRange(ts.trading_start_date, periodRange) : isThisMonth(ts.trading_start_date, now),
  );
  const periodOutcomes = (outcomes ?? []).filter((o) =>
    periodRange ? inRange(o.outcome_date, periodRange) : isThisMonth(o.outcome_date, now),
  );

  const reasonCounts = new Map<TradingStartReason, number>();
  for (const ts of periodTradingStarts) {
    reasonCounts.set(ts.reason, (reasonCounts.get(ts.reason) ?? 0) + 1);
  }
  const byReason = TRADING_START_REASONS.map((reason) => ({
    label: reason,
    count: reasonCounts.get(reason) ?? 0,
  }));

  const outcomesAchievedTotal = (outcomes ?? []).filter((o) => o.outcome_achieved).length;
  const outcomesNotAchievedTotal = (outcomes ?? []).length - outcomesAchievedTotal;
  const outcomeConversionRate =
    (outcomes ?? []).length > 0 ? Math.round((outcomesAchievedTotal / (outcomes ?? []).length) * 100) : 0;

  const activeTradingStarts = (tradingStarts ?? []).filter((ts) => !outcomeByTsId.has(ts.id));
  const iwtCaseloadSize = activeTradingStarts.length;

  const daysToTradingStart = (tradingStarts ?? [])
    .map((ts) => {
      const participant = participantById.get(ts.participant_id);
      return participant ? daysBetween(participant.scheme_start_date, ts.trading_start_date) : null;
    })
    .filter((v): v is number => v !== null);
  const avgDaysToTradingStart = average(daysToTradingStart);

  const daysTradingStartToOutcome = (outcomes ?? [])
    .map((o) => {
      const ts = tsById.get(o.trading_start_id);
      return ts ? daysBetween(ts.trading_start_date, o.outcome_date) : null;
    })
    .filter((v): v is number => v !== null);
  const avgDaysTradingStartToOutcome = average(daysTradingStartToOutcome);

  const reviewsByTsId = new Map<string, IwtReview[]>();
  (iwtReviews ?? []).forEach((r) => {
    const list = reviewsByTsId.get(r.trading_start_id) ?? [];
    list.push(r);
    reviewsByTsId.set(r.trading_start_id, list);
  });
  const latestReviewByTsId = new Map<string, IwtReview>();
  (iwtReviews ?? []).forEach((r) => {
    if (!latestReviewByTsId.has(r.trading_start_id)) {
      latestReviewByTsId.set(r.trading_start_id, r);
    }
  });

  const entriesByParticipant = new Map<string, IncomeTrackerEntry[]>();
  (incomeEntries ?? []).forEach((e) => {
    const list = entriesByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    entriesByParticipant.set(e.participant_id, list);
  });

  let approachingDeadline = 0;
  let overdueReviews = 0;
  let participantsAtRisk = 0;
  for (const ts of activeTradingStarts) {
    const deadline = getOutcomeDeadline(ts.trading_start_date, outcomePeriodMonthsFor(ts.reason, settings), now);
    if (!deadline.isOverdue && deadline.monthsRemaining <= 1) approachingDeadline += 1;

    const nextReviewDate = latestReviewByTsId.get(ts.id)?.next_review_date ?? null;
    if (isReviewOverdue(nextReviewDate, now)) overdueReviews += 1;

    const health = computeParticipantHealth(
      ts,
      entriesByParticipant.get(ts.participant_id) ?? [],
      reviewsByTsId.get(ts.id) ?? [],
      settings,
      now,
    );
    if (health.tone === "red") participantsAtRisk += 1;
  }

  const eligibleNotProcessed = (participants ?? []).filter(
    (p) =>
      p.status === "Active" &&
      evaluateTradingStartEligibility({
        participant: p,
        entries: entriesByParticipant.get(p.id) ?? [],
        settings,
      }).some((r) => r.eligible),
  ).length;

  const advisorStats = new Map<
    string,
    { tradingStarts: number; outcomesAchieved: number; outcomesNotAchieved: number }
  >();
  for (const ts of tradingStarts ?? []) {
    const existing = advisorStats.get(ts.original_advisor_id) ?? {
      tradingStarts: 0,
      outcomesAchieved: 0,
      outcomesNotAchieved: 0,
    };
    existing.tradingStarts += 1;
    advisorStats.set(ts.original_advisor_id, existing);
  }
  for (const o of outcomes ?? []) {
    const ts = tsById.get(o.trading_start_id);
    if (!ts) continue;
    const existing = advisorStats.get(ts.original_advisor_id) ?? {
      tradingStarts: 0,
      outcomesAchieved: 0,
      outcomesNotAchieved: 0,
    };
    if (o.outcome_achieved) existing.outcomesAchieved += 1;
    else existing.outcomesNotAchieved += 1;
    advisorStats.set(ts.original_advisor_id, existing);
  }

  const caseloadByAdvisor = new Map<string, number>();
  for (const p of participants ?? []) {
    caseloadByAdvisor.set(p.advisor_id, (caseloadByAdvisor.get(p.advisor_id) ?? 0) + 1);
  }
  // Advisors with no Trading Starts or Outcomes yet still belong on the
  // leaderboard so their caseload is visible.
  for (const advisor of advisors) {
    if (!advisorStats.has(advisor.id)) {
      advisorStats.set(advisor.id, { tradingStarts: 0, outcomesAchieved: 0, outcomesNotAchieved: 0 });
    }
  }

  const byAdvisor: TradingStartAdvisorRow[] = [...advisorStats.entries()]
    .map(([advisorId, stats]) => {
      const advisor = advisorById.get(advisorId);
      return {
        advisorId,
        label: advisor?.full_name ?? "Unknown advisor",
        officeLabel: advisor?.office_name ?? "Unknown office",
        activeCaseload: caseloadByAdvisor.get(advisorId) ?? 0,
        ...stats,
      };
    })
    .sort((a, b) => b.tradingStarts - a.tradingStarts);

  const monthlyTotals = new Map<string, { tradingStarts: number; outcomes: number }>();
  for (const ts of tradingStarts ?? []) {
    const key = ts.trading_start_date.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { tradingStarts: 0, outcomes: 0 };
    existing.tradingStarts += 1;
    monthlyTotals.set(key, existing);
  }
  for (const o of outcomes ?? []) {
    const key = o.outcome_date.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { tradingStarts: 0, outcomes: 0 };
    existing.outcomes += 1;
    monthlyTotals.set(key, existing);
  }
  const monthlyTrends: MonthlyTrendPoint[] = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, totals]) => ({ month, ...totals }));

  return {
    totalTradingStarts: (tradingStarts ?? []).length,
    tradingStartsInPeriod: periodTradingStarts.length,
    periodLabel: periodRange ? "Selected period" : "This month",
    byReason,
    outcomesInPeriod: periodOutcomes.length,
    outcomesAchievedTotal,
    outcomesNotAchievedTotal,
    outcomeConversionRate,
    iwtCaseloadSize,
    avgDaysToTradingStart,
    avgDaysTradingStartToOutcome,
    approachingDeadline,
    overdueReviews,
    eligibleNotProcessed,
    participantsAtRisk,
    byAdvisor,
    monthlyTrends,
  };
}
