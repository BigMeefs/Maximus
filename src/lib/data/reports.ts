import { createClient } from "@/lib/supabase/server";
import { listAdvisors, listOffices } from "@/lib/data/advisor";
import { getGatewayReadinessChecklist } from "@/lib/business-rules";
import {
  evaluateTradingStartEligibility,
  getOutcomeDeadline,
  isReviewOverdue,
  outcomePeriodMonthsFor,
} from "@/lib/trading-start-rules";
import { computeParticipantHealth } from "@/lib/participant-health";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import { FUNDING_APPLICATION_STATUSES, GATEWAY_BOOKED_STATUSES, TRADING_START_REASONS } from "@/types/database";
import type {
  BusinessStage,
  EvidenceFile,
  FundingApplicationStatus,
  GatewayBookedStatus,
  GatewayReadiness,
  IncomeTrackerEntry,
  IwtReview,
  Participant,
  RagStatus,
  TradingStartReason,
} from "@/types/database";

type Bucket = { label: string; count: number };

type PerformanceBucket = Bucket & { gatewayReady: number; gatewayCompleted: number };

export type ReportDateRange = { from?: string; to?: string };

// Company-wide reports are filterable by Office and Advisor (Team was
// explicitly descoped — no Team entity exists in this app) and by Date
// Range, applied to the underlying date-bearing records (Trading Starts,
// Outcomes, funding applications, income tracker entries).
export type ReportFilters = {
  officeId?: string;
  advisorId?: string;
  dateRange?: ReportDateRange;
};

function inRange(dateStr: string, range?: ReportDateRange): boolean {
  if (!range) return true;
  if (range.from && dateStr < range.from) return false;
  if (range.to && dateStr > range.to) return false;
  return true;
}

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
  byGatewayBookingStatus: Bucket[];
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

export async function getCompanyReportStats(filters?: ReportFilters): Promise<ReportStats> {
  const supabase = await createClient();

  const [
    advisors,
    { data: participants },
    { data: evidenceRows },
    { data: readinessRows },
    { data: fundingRows },
    { data: incomeTrackerRows },
  ] = await Promise.all([
    listAdvisors(),
    supabase.from("participants").select("*"),
    supabase.from("evidence_files").select("*"),
    supabase.from("gateway_readiness").select("*"),
    supabase.from("funding_records").select("*"),
    supabase.from("income_tracker_entries").select("participant_id, month, income, expense, mileage_cost"),
  ]);

  const advisorById = new Map(advisors.map((a) => [a.id, a]));

  const allowedAdvisorIds = filters?.advisorId
    ? new Set([filters.advisorId])
    : filters?.officeId
      ? new Set(advisors.filter((a) => a.office_id === filters.officeId).map((a) => a.id))
      : null;

  const rows: Participant[] = (participants ?? []).filter(
    (p) => !allowedAdvisorIds || allowedAdvisorIds.has(p.advisor_id),
  );
  const participantIdSet = new Set(rows.map((p) => p.id));

  const evidenceByParticipant = groupBy((evidenceRows ?? []) as EvidenceFile[], (e) => e.participant_id);
  const incomeEntriesByParticipant = groupBy(
    (incomeTrackerRows ?? []) as IncomeTrackerEntry[],
    (e) => e.participant_id,
  );
  const readinessByParticipant = new Map<string, GatewayReadiness>(
    (readinessRows ?? []).map((r) => [r.participant_id, r]),
  );

  const officeStats = new Map<string, { count: number; gatewayReady: number; gatewayCompleted: number }>();
  const advisorStats = new Map<string, { count: number; gatewayReady: number; gatewayCompleted: number }>();
  const sectorCounts = new Map<string, number>();
  const ragCounts = new Map<RagStatus, number>();
  const stageCounts = new Map<BusinessStage, number>();
  const gatewayCounts = new Map<string, number>();
  const gatewayBookingCounts = new Map<GatewayBookedStatus, number>();

  function bump(
    map: Map<string, { count: number; gatewayReady: number; gatewayCompleted: number }>,
    key: string,
    gatewayReady: boolean,
    gatewayCompleted: boolean,
  ) {
    const existing = map.get(key) ?? { count: 0, gatewayReady: 0, gatewayCompleted: 0 };
    existing.count += 1;
    if (gatewayReady) existing.gatewayReady += 1;
    if (gatewayCompleted) existing.gatewayCompleted += 1;
    map.set(key, existing);
  }

  for (const p of rows) {
    const advisor = advisorById.get(p.advisor_id);
    const officeLabel = advisor?.office_name ?? "Unknown office";

    const sector = p.business_sector || "Not specified";
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);

    ragCounts.set(p.rag_status, (ragCounts.get(p.rag_status) ?? 0) + 1);
    stageCounts.set(p.business_stage, (stageCounts.get(p.business_stage) ?? 0) + 1);

    const readiness = getGatewayReadinessChecklist({
      readiness: readinessByParticipant.get(p.id) ?? null,
      incomeTrackerEntries: incomeEntriesByParticipant.get(p.id) ?? [],
      evidenceFiles: evidenceByParticipant.get(p.id) ?? [],
    });
    const gatewayLabel = gatewayStatusLabel(readiness.percent);
    gatewayCounts.set(gatewayLabel, (gatewayCounts.get(gatewayLabel) ?? 0) + 1);

    gatewayBookingCounts.set(p.gateway_booked_status, (gatewayBookingCounts.get(p.gateway_booked_status) ?? 0) + 1);

    const isGatewayReady = gatewayLabel === "Ready";
    const isGatewayCompleted = p.gateway_booked_status === "Completed";
    bump(officeStats, officeLabel, isGatewayReady, isGatewayCompleted);
    bump(advisorStats, p.advisor_id, isGatewayReady, isGatewayCompleted);
  }

  const byOffice = [...officeStats.entries()]
    .map(([label, stats]) => ({ label, count: stats.count, gatewayReady: stats.gatewayReady, gatewayCompleted: stats.gatewayCompleted }))
    .sort((a, b) => b.count - a.count);

  const byAdvisor = [...advisorStats.entries()]
    .map(([advisorId, stats]) => {
      const advisor = advisorById.get(advisorId);
      return {
        label: advisor?.full_name ?? "Unknown advisor",
        officeLabel: advisor?.office_name ?? "Unknown office",
        count: stats.count,
        gatewayReady: stats.gatewayReady,
        gatewayCompleted: stats.gatewayCompleted,
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
  const byGatewayBookingStatus = GATEWAY_BOOKED_STATUSES.map((label) => ({
    label,
    count: gatewayBookingCounts.get(label) ?? 0,
  }));

  const fundingStatusTotals = new Map<
    FundingApplicationStatus,
    { count: number; totalRequested: number; totalApproved: number; totalReceived: number }
  >();
  const scopedFundingRows = (fundingRows ?? []).filter(
    (f) =>
      participantIdSet.has(f.participant_id) &&
      (!f.application_date || inRange(f.application_date, filters?.dateRange)),
  );
  for (const f of scopedFundingRows) {
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

  const scopedIncomeRows = (incomeTrackerRows ?? []).filter(
    (e) => participantIdSet.has(e.participant_id) && inRange(e.month, filters?.dateRange),
  );
  const monthlyTotals = new Map<string, { income: number; expenses: number }>();
  for (const e of scopedIncomeRows) {
    const key = e.month.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { income: 0, expenses: 0 };
    existing.income += Number(e.income) || 0;
    existing.expenses += Number(e.expense) || 0;
    monthlyTotals.set(key, existing);
  }
  const sortedMonthlyProgress = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, ...totals }));
  const monthlyProgress = filters?.dateRange ? sortedMonthlyProgress : sortedMonthlyProgress.slice(-12);

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
    byGatewayBookingStatus,
    byFundingStatus,
  };
}

// ---------------------------------------------------------------------------
// Trading Start / IWT / Outcome reporting — company-wide, with original
// advisors retaining ownership of their Trading Start and outcome stats even
// after the participant transfers to an IWT advisor.
// ---------------------------------------------------------------------------
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
  forecastOutcomes: number;
  avgDaysToTradingStart: number | null;
  avgDaysTradingStartToOutcome: number | null;
  approachingDeadline: number;
  overdueReviews: number;
  eligibleNotProcessed: number;
  participantsAtRisk: number;
  byAdvisor: TradingStartAdvisorRow[];
  monthlyTrends: MonthlyTrendPoint[];
};

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
  filters?: ReportFilters,
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

  const allowedAdvisorIds = filters?.advisorId
    ? new Set([filters.advisorId])
    : filters?.officeId
      ? new Set(advisors.filter((a) => a.office_id === filters.officeId).map((a) => a.id))
      : null;
  const scopedAdvisors = allowedAdvisorIds ? advisors.filter((a) => allowedAdvisorIds.has(a.id)) : advisors;
  // Trading Starts and Outcomes stay attributed to the original advisor, so
  // Office/Advisor filters scope by original_advisor_id here.
  const scopedTradingStarts = allowedAdvisorIds
    ? (tradingStarts ?? []).filter((ts) => allowedAdvisorIds.has(ts.original_advisor_id))
    : tradingStarts ?? [];
  const scopedOutcomes = allowedAdvisorIds
    ? (outcomes ?? []).filter((o) => {
        const ts = tsById.get(o.trading_start_id);
        return ts ? allowedAdvisorIds.has(ts.original_advisor_id) : false;
      })
    : outcomes ?? [];
  // Caseload-based metrics scope by the participant's current advisor.
  const scopedParticipants = allowedAdvisorIds
    ? (participants ?? []).filter((p) => allowedAdvisorIds.has(p.advisor_id))
    : participants ?? [];

  const dateRange = filters?.dateRange;
  const periodRange: ReportDateRange | undefined = dateRange?.from || dateRange?.to ? dateRange : undefined;
  const periodTradingStarts = scopedTradingStarts.filter((ts) =>
    periodRange ? inRange(ts.trading_start_date, periodRange) : isThisMonth(ts.trading_start_date, now),
  );
  const periodOutcomes = scopedOutcomes.filter((o) =>
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

  const outcomesAchievedTotal = scopedOutcomes.filter((o) => o.outcome_achieved).length;
  const outcomesNotAchievedTotal = scopedOutcomes.length - outcomesAchievedTotal;
  const outcomeConversionRate =
    scopedOutcomes.length > 0 ? Math.round((outcomesAchievedTotal / scopedOutcomes.length) * 100) : 0;

  const activeTradingStarts = scopedTradingStarts.filter((ts) => !outcomeByTsId.has(ts.id));
  const iwtCaseloadSize = activeTradingStarts.length;

  const daysToTradingStart = scopedTradingStarts
    .map((ts) => {
      const participant = participantById.get(ts.participant_id);
      return participant ? daysBetween(participant.scheme_start_date, ts.trading_start_date) : null;
    })
    .filter((v): v is number => v !== null);
  const avgDaysToTradingStart = average(daysToTradingStart);

  const daysTradingStartToOutcome = scopedOutcomes
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
  let forecastOutcomes = 0;
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
    else forecastOutcomes += 1;
  }

  const eligibleNotProcessed = scopedParticipants.filter(
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
  for (const ts of scopedTradingStarts) {
    const existing = advisorStats.get(ts.original_advisor_id) ?? {
      tradingStarts: 0,
      outcomesAchieved: 0,
      outcomesNotAchieved: 0,
    };
    existing.tradingStarts += 1;
    advisorStats.set(ts.original_advisor_id, existing);
  }
  for (const o of scopedOutcomes) {
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
  for (const p of scopedParticipants) {
    caseloadByAdvisor.set(p.advisor_id, (caseloadByAdvisor.get(p.advisor_id) ?? 0) + 1);
  }
  // Advisors with no Trading Starts or Outcomes yet still belong on the
  // leaderboard so their caseload is visible.
  for (const advisor of scopedAdvisors) {
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
  for (const ts of scopedTradingStarts) {
    const key = ts.trading_start_date.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { tradingStarts: 0, outcomes: 0 };
    existing.tradingStarts += 1;
    monthlyTotals.set(key, existing);
  }
  for (const o of scopedOutcomes) {
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
    totalTradingStarts: scopedTradingStarts.length,
    tradingStartsInPeriod: periodTradingStarts.length,
    periodLabel: periodRange ? "Selected period" : "This month",
    byReason,
    outcomesInPeriod: periodOutcomes.length,
    outcomesAchievedTotal,
    outcomesNotAchievedTotal,
    outcomeConversionRate,
    iwtCaseloadSize,
    forecastOutcomes,
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

// ---------------------------------------------------------------------------
// Office Reporting — per-office breakdown of Trading Starts, Outcomes, GSE /
// NGSE / Claim Closed participants, Active IWT, funding requests/approved/
// rejected and Income Tracker Compliance. Filterable by Office (and Advisor,
// which narrows a single office row down to one advisor's contribution).
// ---------------------------------------------------------------------------
export type OfficeReportRow = {
  officeId: string;
  officeName: string;
  tradingStarts: number;
  outcomes: number;
  gseParticipants: number;
  ngseParticipants: number;
  claimClosedParticipants: number;
  activeIwt: number;
  fundingRequests: number;
  fundingApproved: number;
  fundingRejected: number;
  incomeTrackerCompliance: number;
};

export async function getOfficeReportStats(filters?: ReportFilters): Promise<OfficeReportRow[]> {
  const supabase = await createClient();

  const [
    offices,
    advisors,
    { data: participants },
    { data: tradingStarts },
    { data: outcomes },
    { data: fundingRows },
    { data: incomeRows },
  ] = await Promise.all([
    listOffices(),
    listAdvisors(),
    supabase.from("participants").select("id, advisor_id, status"),
    supabase.from("trading_starts").select("*"),
    supabase.from("outcome_records").select("*"),
    supabase.from("funding_records").select("participant_id, application_status, application_date"),
    supabase.from("income_tracker_entries").select("participant_id, month"),
  ]);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const tsById = new Map((tradingStarts ?? []).map((ts) => [ts.id, ts]));
  const outcomeByTsId = new Map((outcomes ?? []).map((o) => [o.trading_start_id, o]));

  const latestIncomeMonthByParticipant = new Map<string, string>();
  for (const e of incomeRows ?? []) {
    const existing = latestIncomeMonthByParticipant.get(e.participant_id);
    if (!existing || e.month > existing) latestIncomeMonthByParticipant.set(e.participant_id, e.month);
  }

  const scopedOffices = filters?.officeId ? offices.filter((o) => o.id === filters.officeId) : offices;

  return scopedOffices.map((office) => {
    const officeAdvisorIds = new Set(
      advisors
        .filter((a) => a.office_id === office.id && (!filters?.advisorId || a.id === filters.advisorId))
        .map((a) => a.id),
    );

    const officeTradingStarts = (tradingStarts ?? []).filter(
      (ts) => officeAdvisorIds.has(ts.original_advisor_id) && inRange(ts.trading_start_date, filters?.dateRange),
    );
    const officeOutcomes = (outcomes ?? []).filter((o) => {
      const ts = tsById.get(o.trading_start_id);
      return !!ts && officeAdvisorIds.has(ts.original_advisor_id) && inRange(o.outcome_date, filters?.dateRange);
    });

    const gseParticipants = officeTradingStarts.filter((ts) => ts.reason === "GSE").length;
    const ngseParticipants = officeTradingStarts.filter((ts) => ts.reason === "NGSE").length;
    const claimClosedParticipants = officeTradingStarts.filter(
      (ts) => ts.reason === "Claim Closed Whilst Self Employed",
    ).length;
    const activeIwt = officeTradingStarts.filter((ts) => !outcomeByTsId.has(ts.id)).length;

    const officeParticipantIds = new Set(
      (participants ?? []).filter((p) => officeAdvisorIds.has(p.advisor_id)).map((p) => p.id),
    );
    const officeFunding = (fundingRows ?? []).filter(
      (f) =>
        officeParticipantIds.has(f.participant_id) &&
        (!f.application_date || inRange(f.application_date, filters?.dateRange)),
    );
    const fundingRequests = officeFunding.length;
    const fundingApproved = officeFunding.filter(
      (f) => f.application_status === "Approved" || f.application_status === "Received",
    ).length;
    const fundingRejected = officeFunding.filter((f) => f.application_status === "Declined").length;

    const activeParticipants = (participants ?? []).filter(
      (p) => officeAdvisorIds.has(p.advisor_id) && p.status === "Active",
    );
    const compliant = activeParticipants.filter(
      (p) => latestIncomeMonthByParticipant.get(p.id)?.slice(0, 7) === currentMonthKey,
    ).length;
    const incomeTrackerCompliance =
      activeParticipants.length > 0 ? Math.round((compliant / activeParticipants.length) * 100) : 100;

    return {
      officeId: office.id,
      officeName: office.name,
      tradingStarts: officeTradingStarts.length,
      outcomes: officeOutcomes.length,
      gseParticipants,
      ngseParticipants,
      claimClosedParticipants,
      activeIwt,
      fundingRequests,
      fundingApproved,
      fundingRejected,
      incomeTrackerCompliance,
    };
  });
}
