import type { IncomeTrackerEntry, Participant, ProgrammeSettings, TradingStartReason } from "@/types/database";

export function netProfit(entry: Pick<IncomeTrackerEntry, "income" | "expense" | "mileage_cost">): number {
  return Number(entry.income) - Number(entry.expense) - Number(entry.mileage_cost);
}

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthsBetween(fromDateStr: string, asOf: Date = new Date()): number {
  const from = new Date(fromDateStr);
  return (asOf.getFullYear() - from.getFullYear()) * 12 + (asOf.getMonth() - from.getMonth());
}

function areConsecutiveMonths(aMonth: string, bMonth: string): boolean {
  const [ay, am] = aMonth.split("-").map(Number);
  const [by, bm] = bMonth.split("-").map(Number);
  return by * 12 + (bm - 1) - (ay * 12 + (am - 1)) === 1;
}

// ---------------------------------------------------------------------------
// NGSE two-month-average — every consecutive Income Tracker month pair,
// with its combined average net profit. Shared by "current average" display
// and eligibility detection.
// ---------------------------------------------------------------------------
export type MonthPairAverage = {
  month1: string;
  month2: string;
  month1NetProfit: number;
  month2NetProfit: number;
  averageNetProfit: number;
  month2EntryDate: string;
};

function consecutivePairs(entries: IncomeTrackerEntry[]): MonthPairAverage[] {
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
  const pairs: MonthPairAverage[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const month1 = prev.month.slice(0, 7);
    const month2 = curr.month.slice(0, 7);
    if (!areConsecutiveMonths(month1, month2)) continue;

    const month1NetProfit = netProfit(prev);
    const month2NetProfit = netProfit(curr);
    pairs.push({
      month1,
      month2,
      month1NetProfit,
      month2NetProfit,
      averageNetProfit: (month1NetProfit + month2NetProfit) / 2,
      month2EntryDate: curr.entry_date,
    });
  }

  return pairs;
}

// The most recent consecutive-month pair, regardless of whether it meets the
// eligibility threshold — for the participant profile's always-visible
// "Current two month average" display.
export function getLatestTwoMonthAverage(entries: IncomeTrackerEntry[]): MonthPairAverage | null {
  const pairs = consecutivePairs(entries);
  return pairs.length > 0 ? pairs[pairs.length - 1] : null;
}

export type NgseEligibility = {
  eligible: boolean;
  threshold: number;
  month1: string | null;
  month2: string | null;
  month1NetProfit: number | null;
  month2NetProfit: number | null;
  averageNetProfit: number | null;
  dateEligible: string | null;
};

// NGSE Trading Start eligibility — the average net profit across ANY pair of
// consecutive Income Tracker months meets the configured threshold (not two
// months each individually above it). The first qualifying pair,
// chronologically, sets the eligibility date.
export function evaluateNgseEligibility(entries: IncomeTrackerEntry[], threshold: number): NgseEligibility {
  const qualifying = consecutivePairs(entries).find((pair) => pair.averageNetProfit >= threshold);

  if (!qualifying) {
    return {
      eligible: false,
      threshold,
      month1: null,
      month2: null,
      month1NetProfit: null,
      month2NetProfit: null,
      averageNetProfit: null,
      dateEligible: null,
    };
  }

  return {
    eligible: true,
    threshold,
    month1: qualifying.month1,
    month2: qualifying.month2,
    month1NetProfit: qualifying.month1NetProfit,
    month2NetProfit: qualifying.month2NetProfit,
    averageNetProfit: qualifying.averageNetProfit,
    dateEligible: qualifying.month2EntryDate,
  };
}

// ---------------------------------------------------------------------------
// GSE / Claim Closed eligibility — simple, advisor-asserted markers rather
// than anything calculated from Income Tracker data.
// ---------------------------------------------------------------------------
export type SimpleEligibility = {
  eligible: boolean;
  detail: string;
};

export function evaluateGseEligibility(participant: Pick<Participant, "is_gse">): SimpleEligibility {
  return {
    eligible: participant.is_gse,
    detail: participant.is_gse
      ? "Marked as Gainfully Self Employed."
      : "Not yet marked as Gainfully Self Employed.",
  };
}

export function evaluateClaimClosedEligibility(participant: Pick<Participant, "claim_closed">): SimpleEligibility {
  return {
    eligible: participant.claim_closed,
    detail: participant.claim_closed
      ? "Claim closed while self-employed."
      : "Claim not yet closed.",
  };
}

// ---------------------------------------------------------------------------
// Trading Start rules engine — a participant can qualify via any of the
// rules below. Adding a new Trading Start path later only requires adding
// another rule to TRADING_START_RULES; nothing else in the app needs to
// change (future-proofing requirement).
// ---------------------------------------------------------------------------
export type TradingStartEligibilityContext = {
  participant: Pick<Participant, "is_gse" | "claim_closed">;
  entries: IncomeTrackerEntry[];
  settings: Pick<ProgrammeSettings, "ngse_average_threshold">;
};

export type TradingStartEligibility = {
  reason: TradingStartReason;
  eligible: boolean;
  detail: string;
  ngse?: NgseEligibility;
};

type TradingStartRule = {
  reason: TradingStartReason;
  evaluate: (ctx: TradingStartEligibilityContext) => TradingStartEligibility;
};

const currencyLabel = (value: number) => `£${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const GSE_RULE: TradingStartRule = {
  reason: "GSE",
  evaluate: ({ participant }) => {
    const result = evaluateGseEligibility(participant);
    return { reason: "GSE", eligible: result.eligible, detail: result.detail };
  },
};

const CLAIM_CLOSED_RULE: TradingStartRule = {
  reason: "Claim Closed Whilst Self Employed",
  evaluate: ({ participant }) => {
    const result = evaluateClaimClosedEligibility(participant);
    return { reason: "Claim Closed Whilst Self Employed", eligible: result.eligible, detail: result.detail };
  },
};

const NGSE_RULE: TradingStartRule = {
  reason: "NGSE",
  evaluate: ({ entries, settings }) => {
    const ngse = evaluateNgseEligibility(entries, settings.ngse_average_threshold);
    return {
      reason: "NGSE",
      eligible: ngse.eligible,
      detail: ngse.eligible
        ? `Two-month average net profit of ${currencyLabel(ngse.averageNetProfit!)} across ${ngse.month1} and ${ngse.month2} meets the ${currencyLabel(ngse.threshold)} threshold.`
        : `No consecutive two-month average has reached the ${currencyLabel(ngse.threshold)} threshold yet.`,
      ngse,
    };
  },
};

const TRADING_START_RULES: TradingStartRule[] = [GSE_RULE, CLAIM_CLOSED_RULE, NGSE_RULE];

export function evaluateTradingStartEligibility(
  ctx: TradingStartEligibilityContext,
): TradingStartEligibility[] {
  return TRADING_START_RULES.map((rule) => rule.evaluate(ctx));
}

// ---------------------------------------------------------------------------
// The shared Outcome deadline clock. periodMonths is configured per path —
// outcome_period_months for NGSE/Claim Closed, gse_outcome_period_months for
// GSE — never hard-coded.
// ---------------------------------------------------------------------------
export type OutcomeDeadline = {
  deadlineDate: string;
  monthsElapsed: number;
  monthsRemaining: number;
  daysRemaining: number;
  isOverdue: boolean;
};

export function getOutcomeDeadline(
  tradingStartDate: string,
  periodMonths: number,
  asOf: Date = new Date(),
): OutcomeDeadline {
  const deadline = addMonths(tradingStartDate, periodMonths);
  const monthsElapsed = Math.max(0, monthsBetween(tradingStartDate, asOf));
  const monthsRemaining = Math.max(0, periodMonths - monthsElapsed);
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    deadlineDate: toIsoDate(deadline),
    monthsElapsed,
    monthsRemaining,
    daysRemaining,
    isOverdue: asOf > deadline,
  };
}

// ---------------------------------------------------------------------------
// NGSE / Claim Closed outcome: cumulative net profit must reach the
// configured target within the configured period of the Trading Start date.
// ---------------------------------------------------------------------------
export type MonetaryOutcomeProgress = OutcomeDeadline & {
  cumulativeProfit: number;
  target: number;
  percentComplete: number;
  remaining: number;
  isAchieved: boolean;
};

export function computeMonetaryOutcomeProgress(
  tradingStartDate: string,
  entries: IncomeTrackerEntry[],
  settings: Pick<ProgrammeSettings, "outcome_target" | "outcome_period_months">,
  asOf: Date = new Date(),
): MonetaryOutcomeProgress {
  const deadline = getOutcomeDeadline(tradingStartDate, settings.outcome_period_months, asOf);
  const startMonth = tradingStartDate.slice(0, 7);
  const deadlineMonth = deadline.deadlineDate.slice(0, 7);

  const cumulativeProfit = entries
    .filter((e) => {
      const month = e.month.slice(0, 7);
      return month >= startMonth && month <= deadlineMonth;
    })
    .reduce((sum, e) => sum + netProfit(e), 0);

  return {
    ...deadline,
    cumulativeProfit,
    target: settings.outcome_target,
    percentComplete: Math.min(100, Math.round((cumulativeProfit / settings.outcome_target) * 100)),
    remaining: Math.max(0, settings.outcome_target - cumulativeProfit),
    isAchieved: cumulativeProfit >= settings.outcome_target,
  };
}

// ---------------------------------------------------------------------------
// GSE outcome: no monetary target — the participant just needs to remain
// gainfully self-employed for the full configured window, confirmed
// manually.
// ---------------------------------------------------------------------------
export type GseOutcomeProgress = OutcomeDeadline & {
  readyToConfirm: boolean;
};

export function computeGseOutcomeProgress(
  tradingStartDate: string,
  settings: Pick<ProgrammeSettings, "gse_outcome_period_months">,
  asOf: Date = new Date(),
): GseOutcomeProgress {
  const deadline = getOutcomeDeadline(tradingStartDate, settings.gse_outcome_period_months, asOf);
  return { ...deadline, readyToConfirm: deadline.monthsElapsed >= settings.gse_outcome_period_months };
}

// The Outcome monitoring period is configured per path — gse_outcome_period_months
// for GSE, outcome_period_months for NGSE / Claim Closed.
export function outcomePeriodMonthsFor(
  reason: TradingStartReason,
  settings: Pick<ProgrammeSettings, "outcome_period_months" | "gse_outcome_period_months">,
): number {
  return reason === "GSE" ? settings.gse_outcome_period_months : settings.outcome_period_months;
}

export function isReviewOverdue(nextReviewDate: string | null, asOf: Date = new Date()): boolean {
  return !!nextReviewDate && new Date(nextReviewDate) < asOf;
}

// ---------------------------------------------------------------------------
// Income declarations — expected once per calendar month. The current month
// isn't over yet, so "missing" is checked against the most recently
// completed month.
// ---------------------------------------------------------------------------
export function getExpectedDeclarationMonth(asOf: Date = new Date()): string {
  const d = new Date(asOf.getFullYear(), asOf.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isDeclarationMissing(
  entries: IncomeTrackerEntry[],
  tradingStartDate: string,
  asOf: Date = new Date(),
): boolean {
  const expectedMonth = getExpectedDeclarationMonth(asOf);
  if (expectedMonth < tradingStartDate.slice(0, 7)) return false;
  return !entries.some((e) => e.month.slice(0, 7) === expectedMonth);
}

// ---------------------------------------------------------------------------
// Income analytics — monthly history plus the headline figures for the
// Income Tracker tab (average/highest/lowest month, cumulative profit).
// ---------------------------------------------------------------------------
export type MonthlyIncomePoint = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  mileageCost: number;
  netProfit: number;
};

export type IncomeAnalytics = {
  monthly: MonthlyIncomePoint[];
  averageMonthlyProfit: number;
  highestMonth: MonthlyIncomePoint | null;
  lowestMonth: MonthlyIncomePoint | null;
  totalCumulativeProfit: number;
};

export function computeIncomeAnalytics(entries: IncomeTrackerEntry[]): IncomeAnalytics {
  const monthly = [...entries]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((e) => ({
      month: e.month.slice(0, 7),
      income: Number(e.income),
      expense: Number(e.expense),
      mileageCost: Number(e.mileage_cost),
      netProfit: netProfit(e),
    }));

  const totalCumulativeProfit = monthly.reduce((sum, m) => sum + m.netProfit, 0);
  const averageMonthlyProfit = monthly.length > 0 ? Math.round(totalCumulativeProfit / monthly.length) : 0;
  const highestMonth = monthly.length > 0 ? monthly.reduce((a, b) => (b.netProfit > a.netProfit ? b : a)) : null;
  const lowestMonth = monthly.length > 0 ? monthly.reduce((a, b) => (b.netProfit < a.netProfit ? b : a)) : null;

  return { monthly, averageMonthlyProfit, highestMonth, lowestMonth, totalCumulativeProfit };
}

export function computeProfitSinceTradingStart(tradingStartDate: string, entries: IncomeTrackerEntry[]): number {
  const startMonth = tradingStartDate.slice(0, 7);
  return entries
    .filter((e) => e.month.slice(0, 7) >= startMonth)
    .reduce((sum, e) => sum + netProfit(e), 0);
}
