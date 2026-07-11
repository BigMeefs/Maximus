import { createClient } from "@/lib/supabase/server";
import { getGatewayReadinessChecklist } from "@/lib/business-rules";
import { netProfit } from "@/lib/trading-start-rules";
import type {
  EvidenceFile,
  GatewayReadiness,
  IncomeTrackerEntry,
  TradingStart,
  TradingStartReason,
} from "@/types/database";

const RECENT_TRADING_START_DAYS = 14;

export type GatewayIncompleteRow = {
  participantId: string;
  participantName: string;
  percent: number;
};

export type RecentIncomeRow = {
  participantId: string;
  participantName: string;
  entryDate: string;
  netProfit: number;
};

export type RecentTradingStartRow = {
  participantId: string;
  participantName: string;
  tradingStartDate: string;
  reason: TradingStartReason;
};

export type AdvisorWorkQueue = {
  gatewayIncomplete: GatewayIncompleteRow[];
  recentIncomeSubmissions: RecentIncomeRow[];
  recentTradingStarts: RecentTradingStartRow[];
};

function daysBetween(fromIso: string, toIso: string): number {
  return Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function getAdvisorWorkQueue(
  advisorId: string,
  lastVisitAt: string | null,
): Promise<AdvisorWorkQueue> {
  const supabase = await createClient();
  const now = new Date();
  const todayIso = now.toISOString();

  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("advisor_id", advisorId);

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);
  const nameById = new Map(rows.map((p) => [p.id, p.ptp_name]));
  const activeParticipantIds = rows.filter((p) => p.status === "Active").map((p) => p.id);

  if (participantIds.length === 0) {
    return { gatewayIncomplete: [], recentIncomeSubmissions: [], recentTradingStarts: [] };
  }

  const [
    { data: readinessRows },
    { data: evidenceRows },
    { data: incomeRows },
    { data: tradingStarts },
  ] = await Promise.all([
    supabase.from("gateway_readiness").select("*").in("participant_id", activeParticipantIds),
    supabase.from("evidence_files").select("*").in("participant_id", activeParticipantIds),
    supabase
      .from("income_tracker_entries")
      .select("participant_id, entry_date, month, income, expense, mileage_cost, created_at")
      .in("participant_id", participantIds)
      .order("entry_date", { ascending: false }),
    supabase.from("trading_starts").select("*").eq("original_advisor_id", advisorId),
  ]);

  // ---- Gateway incomplete: Active participants whose Gateway Readiness checklist isn't 100% ----
  const readinessByParticipant = new Map<string, GatewayReadiness>(
    (readinessRows ?? []).map((r) => [r.participant_id, r]),
  );
  const evidenceByParticipant = new Map<string, EvidenceFile[]>();
  (evidenceRows ?? []).forEach((e) => {
    const list = evidenceByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    evidenceByParticipant.set(e.participant_id, list);
  });
  const entries = (incomeRows as IncomeTrackerEntry[] | null ?? []);
  const incomeEntriesByParticipant = new Map<string, IncomeTrackerEntry[]>();
  entries.forEach((e) => {
    const list = incomeEntriesByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    incomeEntriesByParticipant.set(e.participant_id, list);
  });

  const gatewayIncomplete: GatewayIncompleteRow[] = rows
    .filter((p) => p.status === "Active")
    .map((p) => {
      const { percent } = getGatewayReadinessChecklist({
        readiness: readinessByParticipant.get(p.id) ?? null,
        incomeTrackerEntries: incomeEntriesByParticipant.get(p.id) ?? [],
        evidenceFiles: evidenceByParticipant.get(p.id) ?? [],
      });
      return { participantId: p.id, participantName: p.ptp_name, percent };
    })
    .filter((r) => r.percent < 100)
    .sort((a, b) => b.percent - a.percent);

  // ---- Recent income submissions: entries created since the advisor's last visit ----
  const since = lastVisitAt ?? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const recentIncomeSubmissions: RecentIncomeRow[] = entries
    .filter((e) => e.created_at > since)
    .map((e) => ({
      participantId: e.participant_id,
      participantName: nameById.get(e.participant_id) ?? "Unknown",
      entryDate: e.entry_date,
      netProfit: netProfit(e),
    }));

  // ---- Recently achieved Trading Starts (this advisor originated) ----
  const recentTradingStarts: RecentTradingStartRow[] = (tradingStarts as TradingStart[] | null ?? [])
    .filter((ts) => daysBetween(ts.trading_start_date, todayIso) <= RECENT_TRADING_START_DAYS && daysBetween(ts.trading_start_date, todayIso) >= 0)
    .map((ts) => ({
      participantId: ts.participant_id,
      participantName: nameById.get(ts.participant_id) ?? "Unknown",
      tradingStartDate: ts.trading_start_date,
      reason: ts.reason,
    }))
    .sort((a, b) => b.tradingStartDate.localeCompare(a.tradingStartDate));

  return { gatewayIncomplete, recentIncomeSubmissions, recentTradingStarts };
}
