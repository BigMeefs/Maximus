import type { IncomeTrackerEntry } from "@/types/database";

// ---------------------------------------------------------------------------
// Constants from the Trading Start / IWT / Outcome business rules.
// ---------------------------------------------------------------------------
const ELIGIBILITY_NET_PROFIT_THRESHOLD = 900;
const OUTCOME_TARGET = 5300;
const OUTCOME_WINDOW_MONTHS = 6;

function netProfit(entry: Pick<IncomeTrackerEntry, "income" | "expense" | "mileage_cost">): number {
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
// NGSE Trading Start eligibility — two CONSECUTIVE calendar months where
// Income Tracker net profit exceeds £900. Detection only; a Trading Start is
// never created automatically.
// ---------------------------------------------------------------------------
export type NgseEligibility = {
  eligible: boolean;
  qualifyingMonths: string[]; // e.g. ["2026-03", "2026-04"], the two months
};

export function detectNgseEligibility(entries: IncomeTrackerEntry[]): NgseEligibility {
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));

  for (let i = 1; i < sorted.length; i++) {
    const prevMonth = sorted[i - 1].month.slice(0, 7);
    const currMonth = sorted[i].month.slice(0, 7);
    if (!areConsecutiveMonths(prevMonth, currMonth)) continue;

    if (
      netProfit(sorted[i - 1]) > ELIGIBILITY_NET_PROFIT_THRESHOLD &&
      netProfit(sorted[i]) > ELIGIBILITY_NET_PROFIT_THRESHOLD
    ) {
      return { eligible: true, qualifyingMonths: [prevMonth, currMonth] };
    }
  }

  return { eligible: false, qualifyingMonths: [] };
}

// ---------------------------------------------------------------------------
// The shared 6-month deadline clock, used by both outcome paths and the IWT
// panel (months since / months remaining).
// ---------------------------------------------------------------------------
export type OutcomeDeadline = {
  deadlineDate: string;
  monthsElapsed: number;
  monthsRemaining: number;
  isOverdue: boolean;
};

export function getOutcomeDeadline(tradingStartDate: string, asOf: Date = new Date()): OutcomeDeadline {
  const deadline = addMonths(tradingStartDate, OUTCOME_WINDOW_MONTHS);
  const monthsElapsed = Math.max(0, monthsBetween(tradingStartDate, asOf));
  const monthsRemaining = Math.max(0, OUTCOME_WINDOW_MONTHS - monthsElapsed);

  return {
    deadlineDate: toIsoDate(deadline),
    monthsElapsed,
    monthsRemaining,
    isOverdue: asOf > deadline,
  };
}

// ---------------------------------------------------------------------------
// NGSE / Claim Closed outcome: cumulative net profit must reach £5,300
// within 6 months of the Trading Start date.
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
  asOf: Date = new Date(),
): MonetaryOutcomeProgress {
  const deadline = getOutcomeDeadline(tradingStartDate, asOf);
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
    target: OUTCOME_TARGET,
    percentComplete: Math.min(100, Math.round((cumulativeProfit / OUTCOME_TARGET) * 100)),
    remaining: Math.max(0, OUTCOME_TARGET - cumulativeProfit),
    isAchieved: cumulativeProfit >= OUTCOME_TARGET,
  };
}

// ---------------------------------------------------------------------------
// GSE outcome: no monetary target — the participant just needs to remain
// gainfully self-employed for the full 6-month window, confirmed manually.
// ---------------------------------------------------------------------------
export type GseOutcomeProgress = OutcomeDeadline & {
  readyToConfirm: boolean;
};

export function computeGseOutcomeProgress(
  tradingStartDate: string,
  asOf: Date = new Date(),
): GseOutcomeProgress {
  const deadline = getOutcomeDeadline(tradingStartDate, asOf);
  return { ...deadline, readyToConfirm: deadline.monthsElapsed >= OUTCOME_WINDOW_MONTHS };
}

export function isReviewOverdue(nextReviewDate: string | null, asOf: Date = new Date()): boolean {
  return !!nextReviewDate && new Date(nextReviewDate) < asOf;
}
