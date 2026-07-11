import { createClient } from "@/lib/supabase/server";
import { listAdvisors, listOffices } from "@/lib/data/advisor";
import type { MonthlySeriesPoint } from "@/components/reports/monthly-breakdown-chart";

// ---------------------------------------------------------------------------
// Performance Tracker — monitors KPI performance by advisor and by month.
// Trading Starts and Outcomes are always attributed to the advisor who
// originally created the Trading Start (trading_starts.original_advisor_id),
// never to whichever advisor currently supports the participant — same
// attribution rule already used by the Reports "Team leaderboard"
// (src/lib/data/reports.ts). Current Caseload / Current IWT Caseload are the
// one exception: those are operational snapshots of who is supporting whom
// right now, so they read participants.advisor_id (the current advisor).
// ---------------------------------------------------------------------------

export type PerformanceTrackerFilters = {
  month?: number; // 1-12
  year?: number;
  officeId?: string;
  advisorId?: string;
};

export type AdvisorPerformanceRow = {
  advisorId: string;
  advisorName: string;
  officeLabel: string;
  tradingStarts: number;
  outcomesAchieved: number;
  conversionRate: number;
  currentCaseload: number;
  iwtCaseload: number;
  avgDaysToOutcome: number | null;
};

export type PerformanceTrackerData = {
  totals: {
    tradingStarts: number;
    outcomesAchieved: number;
    conversionRate: number;
    currentCaseload: number;
    iwtCaseload: number;
    avgDaysToOutcome: number | null;
  };
  byAdvisor: AdvisorPerformanceRow[];
  monthlyTrends: { month: string; tradingStarts: number; outcomes: number }[];
  byAdvisorMonthly: MonthlySeriesPoint[];
  byAdvisorMonthlyTotals: Record<string, number>;
  byOfficeMonthly: MonthlySeriesPoint[];
  byOfficeMonthlyTotals: Record<string, number>;
};

function matchesMonthYear(dateStr: string, month?: number, year?: number): boolean {
  if (!month && !year) return true;
  const [y, m] = dateStr.split("-");
  if (year && Number(y) !== year) return false;
  if (month && Number(m) !== month) return false;
  return true;
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

export async function getPerformanceTrackerData(
  filters: PerformanceTrackerFilters,
): Promise<PerformanceTrackerData> {
  const supabase = await createClient();

  const [advisors, offices, { data: tradingStarts }, { data: outcomes }, { data: participants }] =
    await Promise.all([
      listAdvisors(),
      listOffices(),
      supabase.from("trading_starts").select("*"),
      supabase.from("outcome_records").select("*"),
      supabase.from("participants").select("id, advisor_id, status"),
    ]);

  const advisorById = new Map(advisors.map((a) => [a.id, a]));
  const officeById = new Map(offices.map((o) => [o.id, o]));
  const tsById = new Map((tradingStarts ?? []).map((ts) => [ts.id, ts]));

  const allowedAdvisorIds = filters.advisorId
    ? new Set([filters.advisorId])
    : filters.officeId
      ? new Set(advisors.filter((a) => a.office_id === filters.officeId).map((a) => a.id))
      : null;
  const scopedAdvisors = allowedAdvisorIds ? advisors.filter((a) => allowedAdvisorIds.has(a.id)) : advisors;

  // Office/Advisor filters scope by the *original* advisor — see header note.
  const scopedTradingStarts = allowedAdvisorIds
    ? (tradingStarts ?? []).filter((ts) => allowedAdvisorIds.has(ts.original_advisor_id))
    : (tradingStarts ?? []);
  const scopedOutcomes = allowedAdvisorIds
    ? (outcomes ?? []).filter((o) => {
        const ts = tsById.get(o.trading_start_id);
        return ts ? allowedAdvisorIds.has(ts.original_advisor_id) : false;
      })
    : (outcomes ?? []);
  const achievedOutcomes = scopedOutcomes.filter((o) => o.outcome_achieved);

  // Caseload is a point-in-time snapshot, not scoped by Month/Year — only by
  // Office/Advisor — and reads the *current* advisor, per the header note.
  const scopedParticipants = allowedAdvisorIds
    ? (participants ?? []).filter((p) => allowedAdvisorIds.has(p.advisor_id))
    : (participants ?? []);
  const caseloadByAdvisor = new Map<string, number>();
  const iwtCaseloadByAdvisor = new Map<string, number>();
  for (const p of scopedParticipants) {
    caseloadByAdvisor.set(p.advisor_id, (caseloadByAdvisor.get(p.advisor_id) ?? 0) + 1);
    if (p.status === "In Work Tracking") {
      iwtCaseloadByAdvisor.set(p.advisor_id, (iwtCaseloadByAdvisor.get(p.advisor_id) ?? 0) + 1);
    }
  }

  // ---- Month/Year-filtered KPI totals, per advisor ----
  const periodTradingStarts = scopedTradingStarts.filter((ts) =>
    matchesMonthYear(ts.trading_start_date, filters.month, filters.year),
  );
  const periodAchievedOutcomes = achievedOutcomes.filter((o) =>
    matchesMonthYear(o.outcome_date, filters.month, filters.year),
  );

  const statsByAdvisor = new Map<
    string,
    { tradingStarts: number; outcomesAchieved: number; daysToOutcome: number[] }
  >();
  for (const advisor of scopedAdvisors) {
    statsByAdvisor.set(advisor.id, { tradingStarts: 0, outcomesAchieved: 0, daysToOutcome: [] });
  }
  for (const ts of periodTradingStarts) {
    const existing = statsByAdvisor.get(ts.original_advisor_id) ?? {
      tradingStarts: 0,
      outcomesAchieved: 0,
      daysToOutcome: [],
    };
    existing.tradingStarts += 1;
    statsByAdvisor.set(ts.original_advisor_id, existing);
  }
  for (const o of periodAchievedOutcomes) {
    const ts = tsById.get(o.trading_start_id);
    if (!ts) continue;
    const existing = statsByAdvisor.get(ts.original_advisor_id) ?? {
      tradingStarts: 0,
      outcomesAchieved: 0,
      daysToOutcome: [],
    };
    existing.outcomesAchieved += 1;
    existing.daysToOutcome.push(daysBetween(ts.trading_start_date, o.outcome_date));
    statsByAdvisor.set(ts.original_advisor_id, existing);
  }

  const byAdvisor: AdvisorPerformanceRow[] = [...statsByAdvisor.entries()]
    .map(([advisorId, stats]) => {
      const advisor = advisorById.get(advisorId);
      return {
        advisorId,
        advisorName: advisor?.full_name ?? "Unknown advisor",
        officeLabel: advisor?.office_name ?? "Unknown office",
        tradingStarts: stats.tradingStarts,
        outcomesAchieved: stats.outcomesAchieved,
        conversionRate:
          stats.tradingStarts > 0 ? Math.round((stats.outcomesAchieved / stats.tradingStarts) * 100) : 0,
        currentCaseload: caseloadByAdvisor.get(advisorId) ?? 0,
        iwtCaseload: iwtCaseloadByAdvisor.get(advisorId) ?? 0,
        avgDaysToOutcome: average(stats.daysToOutcome),
      };
    })
    .sort((a, b) => b.tradingStarts - a.tradingStarts);

  const totals = {
    tradingStarts: periodTradingStarts.length,
    outcomesAchieved: periodAchievedOutcomes.length,
    conversionRate:
      periodTradingStarts.length > 0
        ? Math.round((periodAchievedOutcomes.length / periodTradingStarts.length) * 100)
        : 0,
    currentCaseload: [...caseloadByAdvisor.values()].reduce((a, b) => a + b, 0),
    iwtCaseload: [...iwtCaseloadByAdvisor.values()].reduce((a, b) => a + b, 0),
    avgDaysToOutcome: average(
      periodAchievedOutcomes
        .map((o) => {
          const ts = tsById.get(o.trading_start_id);
          return ts ? daysBetween(ts.trading_start_date, o.outcome_date) : null;
        })
        .filter((v): v is number => v !== null),
    ),
  };

  // ---- Monthly trend charts — respect Office/Advisor filters and, when a
  // Year is picked (with no specific Month), narrow to that year; otherwise
  // show the most recent 12 months of activity. A single Month filter isn't
  // applied here since a one-bar "trend" isn't a useful chart — the KPI
  // cards and table above already show that month's numbers. ----
  const chartTradingStarts = filters.year
    ? scopedTradingStarts.filter((ts) => ts.trading_start_date.startsWith(String(filters.year)))
    : scopedTradingStarts;
  const chartAchievedOutcomes = filters.year
    ? achievedOutcomes.filter((o) => o.outcome_date.startsWith(String(filters.year)))
    : achievedOutcomes;

  const monthlyTotals = new Map<string, { tradingStarts: number; outcomes: number }>();
  for (const ts of chartTradingStarts) {
    const key = ts.trading_start_date.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { tradingStarts: 0, outcomes: 0 };
    existing.tradingStarts += 1;
    monthlyTotals.set(key, existing);
  }
  for (const o of chartAchievedOutcomes) {
    const key = o.outcome_date.slice(0, 7);
    const existing = monthlyTotals.get(key) ?? { tradingStarts: 0, outcomes: 0 };
    existing.outcomes += 1;
    monthlyTotals.set(key, existing);
  }
  const monthlyTrends = [...monthlyTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(filters.year ? 0 : -12)
    .map(([month, totals]) => ({ month, ...totals }));

  // ---- Advisor / Office performance by month (Trading Starts count) ----
  const advisorMonthlyMap = new Map<string, Record<string, number>>();
  const advisorTotals: Record<string, number> = {};
  const officeMonthlyMap = new Map<string, Record<string, number>>();
  const officeTotals: Record<string, number> = {};
  for (const ts of chartTradingStarts) {
    const key = ts.trading_start_date.slice(0, 7);
    const advisor = advisorById.get(ts.original_advisor_id);
    const advisorName = advisor?.full_name ?? "Unknown advisor";
    const officeLabel = advisor ? (officeById.get(advisor.office_id)?.name ?? advisor.office_name) : "Unknown office";

    const advisorRow = advisorMonthlyMap.get(key) ?? {};
    advisorRow[advisorName] = (advisorRow[advisorName] ?? 0) + 1;
    advisorMonthlyMap.set(key, advisorRow);
    advisorTotals[advisorName] = (advisorTotals[advisorName] ?? 0) + 1;

    const officeRow = officeMonthlyMap.get(key) ?? {};
    officeRow[officeLabel] = (officeRow[officeLabel] ?? 0) + 1;
    officeMonthlyMap.set(key, officeRow);
    officeTotals[officeLabel] = (officeTotals[officeLabel] ?? 0) + 1;
  }

  const byAdvisorMonthly: MonthlySeriesPoint[] = [...advisorMonthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(filters.year ? 0 : -12)
    .map(([month, row]) => ({ month, ...row }));
  const byOfficeMonthly: MonthlySeriesPoint[] = [...officeMonthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(filters.year ? 0 : -12)
    .map(([month, row]) => ({ month, ...row }));

  return {
    totals,
    byAdvisor,
    monthlyTrends,
    byAdvisorMonthly,
    byAdvisorMonthlyTotals: advisorTotals,
    byOfficeMonthly,
    byOfficeMonthlyTotals: officeTotals,
  };
}

// ---------------------------------------------------------------------------
// A compact, single-advisor summary for the general Advisor Dashboard —
// lifetime + this month/year totals, all attributed to this advisor as the
// Trading Start owner (original_advisor_id), regardless of where the
// participant is currently assigned.
// ---------------------------------------------------------------------------
export type AdvisorPerformanceSummary = {
  tradingStartsThisMonth: number;
  tradingStartsThisYear: number;
  outcomesThisMonth: number;
  outcomesThisYear: number;
  lifetimeTradingStarts: number;
  lifetimeOutcomes: number;
  conversionRate: number;
};

export async function getAdvisorPerformanceSummary(advisorId: string): Promise<AdvisorPerformanceSummary> {
  const supabase = await createClient();
  const [{ data: tradingStarts }, { data: outcomes }] = await Promise.all([
    supabase.from("trading_starts").select("id, trading_start_date").eq("original_advisor_id", advisorId),
    supabase.from("outcome_records").select("trading_start_id, outcome_date, outcome_achieved"),
  ]);

  const ownTradingStarts = tradingStarts ?? [];
  const tsIds = new Set(ownTradingStarts.map((ts) => ts.id));
  const achievedOutcomes = (outcomes ?? []).filter((o) => tsIds.has(o.trading_start_id) && o.outcome_achieved);

  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const lifetimeTradingStarts = ownTradingStarts.length;
  const lifetimeOutcomes = achievedOutcomes.length;

  return {
    tradingStartsThisMonth: ownTradingStarts.filter((ts) => ts.trading_start_date.slice(0, 7) === currentMonthKey).length,
    tradingStartsThisYear: ownTradingStarts.filter((ts) => ts.trading_start_date.startsWith(currentYear)).length,
    outcomesThisMonth: achievedOutcomes.filter((o) => o.outcome_date.slice(0, 7) === currentMonthKey).length,
    outcomesThisYear: achievedOutcomes.filter((o) => o.outcome_date.startsWith(currentYear)).length,
    lifetimeTradingStarts,
    lifetimeOutcomes,
    conversionRate: lifetimeTradingStarts > 0 ? Math.round((lifetimeOutcomes / lifetimeTradingStarts) * 100) : 0,
  };
}
