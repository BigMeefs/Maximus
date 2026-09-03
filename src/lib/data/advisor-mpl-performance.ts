import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { getAllMplTargets, getMplForMonth, monthKeyOf } from "@/lib/data/mpl";

// ---------------------------------------------------------------------------
// Admin view of each advisor's performance against the Minimum Performance
// Level (MPL). Trading Starts and Outcomes are attributed to the original
// advisor (trading_starts.original_advisor_id) — the same convention
// already used everywhere else in this app (Reports team leaderboard,
// Performance Tracker, the advisor Dashboard's own "Your Performance").
// Percentage Achieved = actual ÷ applicable MPL × 100, uncapped — an
// advisor beating their target can show over 100%.
// ---------------------------------------------------------------------------

export type AdvisorMplPerformanceRow = {
  advisorId: string;
  advisorName: string;
  tradingStartsCurrent: number;
  tradingStartsCurrentPct: number | null;
  outcomesCurrent: number;
  outcomesCurrentPct: number | null;
  tradingStarts3MPct: number | null;
  outcomes3MPct: number | null;
  tradingStarts6MPct: number | null;
  outcomes6MPct: number | null;
};

export type AdvisorMplPerformance = {
  tradingStartsMplCurrent: number | null;
  outcomesMplCurrent: number | null;
  rows: AdvisorMplPerformanceRow[];
};

function lastNMonthKeys(n: number, now: Date): string[] {
  return Array.from({ length: n }, (_, i) => monthKeyOf(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)));
}

// Sums actual performance and applicable MPL only across months that
// actually have an MPL set — a month before any target existed is
// excluded from both sides rather than counted as a zero-target month
// (which would inflate the percentage), per "use the MPL applicable to
// each individual month."
function rollingPct(
  monthKeys: string[],
  countForMonth: (monthKey: string) => number,
  mplForMonth: (monthKey: string) => number | null,
): number | null {
  let actualSum = 0;
  let targetSum = 0;
  for (const key of monthKeys) {
    const mpl = mplForMonth(key);
    if (mpl === null) continue;
    actualSum += countForMonth(key);
    targetSum += mpl;
  }
  return targetSum > 0 ? Math.round((actualSum / targetSum) * 100) : null;
}

export async function getAdvisorMplPerformance(): Promise<AdvisorMplPerformance> {
  const supabase = await createClient();
  const now = new Date();
  const currentMonthKey = monthKeyOf(now);

  const [advisors, targets, { data: tradingStarts }, { data: outcomes }] = await Promise.all([
    listAdvisors({ activeOnly: true }),
    getAllMplTargets(),
    supabase.from("trading_starts").select("id, trading_start_date, original_advisor_id"),
    supabase.from("outcome_records").select("trading_start_id, outcome_date, outcome_achieved"),
  ]);

  const tsRows = tradingStarts ?? [];
  const tsById = new Map(tsRows.map((ts) => [ts.id, ts]));
  const achievedOutcomes = (outcomes ?? []).filter((o) => o.outcome_achieved);

  const mplForMonth = (monthKey: string) => getMplForMonth(monthKey, targets)?.tradingStartsMpl ?? null;
  const outcomesMplForMonth = (monthKey: string) => getMplForMonth(monthKey, targets)?.outcomesMpl ?? null;

  const currentMpl = getMplForMonth(currentMonthKey, targets);
  const months3 = lastNMonthKeys(3, now);
  const months6 = lastNMonthKeys(6, now);

  const rows: AdvisorMplPerformanceRow[] = advisors.map((advisor) => {
    const ownTs = tsRows.filter((ts) => ts.original_advisor_id === advisor.id);
    const ownTsIds = new Set(ownTs.map((ts) => ts.id));
    const ownOutcomes = achievedOutcomes.filter((o) => {
      const ts = tsById.get(o.trading_start_id);
      return ts && ownTsIds.has(ts.id);
    });

    const tsCountForMonth = (monthKey: string) => ownTs.filter((ts) => ts.trading_start_date.slice(0, 7) === monthKey).length;
    const outcomeCountForMonth = (monthKey: string) => ownOutcomes.filter((o) => o.outcome_date.slice(0, 7) === monthKey).length;

    const tradingStartsCurrent = tsCountForMonth(currentMonthKey);
    const outcomesCurrent = outcomeCountForMonth(currentMonthKey);

    return {
      advisorId: advisor.id,
      advisorName: advisor.full_name,
      tradingStartsCurrent,
      tradingStartsCurrentPct: currentMpl ? Math.round((tradingStartsCurrent / currentMpl.tradingStartsMpl) * 100) : null,
      outcomesCurrent,
      outcomesCurrentPct: currentMpl ? Math.round((outcomesCurrent / currentMpl.outcomesMpl) * 100) : null,
      tradingStarts3MPct: rollingPct(months3, tsCountForMonth, mplForMonth),
      outcomes3MPct: rollingPct(months3, outcomeCountForMonth, outcomesMplForMonth),
      tradingStarts6MPct: rollingPct(months6, tsCountForMonth, mplForMonth),
      outcomes6MPct: rollingPct(months6, outcomeCountForMonth, outcomesMplForMonth),
    };
  });

  return {
    tradingStartsMplCurrent: currentMpl?.tradingStartsMpl ?? null,
    outcomesMplCurrent: currentMpl?.outcomesMpl ?? null,
    rows: rows.sort((a, b) => a.advisorName.localeCompare(b.advisorName)),
  };
}
