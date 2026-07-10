import { createClient } from "@/lib/supabase/server";
import { getGatewayChecklist } from "@/lib/business-rules";
import { netProfit } from "@/lib/trading-start-rules";
import type {
  Appointment,
  BusinessPlan,
  DigitalPresenceItem,
  EvidenceFile,
  GatewayChecklistItem,
  HmrcBusinessInfo,
  IncomeTrackerEntry,
  TradingStart,
  TradingStartReason,
} from "@/types/database";

const DUE_FOR_CONTACT_DAYS = 30;
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

export type DueForContactRow = {
  participantId: string;
  participantName: string;
  lastContactDate: string | null;
  daysSinceContact: number | null;
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
  dueForContact: DueForContactRow[];
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
    return { gatewayIncomplete: [], recentIncomeSubmissions: [], dueForContact: [], recentTradingStarts: [] };
  }

  const [
    { data: businessPlans },
    { data: hmrcRows },
    { data: digitalPresenceRows },
    { data: evidenceRows },
    { data: gatewayItemRows },
    { data: appointmentRows },
    { data: incomeRows },
    { data: tradingStarts },
  ] = await Promise.all([
    supabase.from("business_plans").select("*").in("participant_id", activeParticipantIds),
    supabase.from("hmrc_business_info").select("*").in("participant_id", activeParticipantIds),
    supabase.from("digital_presence_items").select("*").in("participant_id", activeParticipantIds),
    supabase.from("evidence_files").select("*").in("participant_id", activeParticipantIds),
    supabase.from("gateway_checklist_items").select("*").in("participant_id", activeParticipantIds),
    supabase.from("appointments").select("*").in("participant_id", participantIds),
    supabase
      .from("income_tracker_entries")
      .select("participant_id, entry_date, income, expense, mileage_cost, created_at")
      .in("participant_id", participantIds)
      .order("entry_date", { ascending: false }),
    supabase.from("trading_starts").select("*").eq("original_advisor_id", advisorId),
  ]);

  // ---- Gateway incomplete: Active participants whose Gateway checklist isn't 100% ----
  const businessPlanByParticipant = new Map<string, BusinessPlan>(
    (businessPlans ?? []).map((bp) => [bp.participant_id, bp]),
  );
  const hmrcByParticipant = new Map<string, HmrcBusinessInfo>((hmrcRows ?? []).map((h) => [h.participant_id, h]));
  const digitalPresenceByParticipant = new Map<string, DigitalPresenceItem[]>();
  (digitalPresenceRows ?? []).forEach((d) => {
    const list = digitalPresenceByParticipant.get(d.participant_id) ?? [];
    list.push(d);
    digitalPresenceByParticipant.set(d.participant_id, list);
  });
  const evidenceByParticipant = new Map<string, EvidenceFile[]>();
  (evidenceRows ?? []).forEach((e) => {
    const list = evidenceByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    evidenceByParticipant.set(e.participant_id, list);
  });
  const gatewayItemsByParticipant = new Map<string, GatewayChecklistItem[]>();
  (gatewayItemRows ?? []).forEach((g) => {
    const list = gatewayItemsByParticipant.get(g.participant_id) ?? [];
    list.push(g);
    gatewayItemsByParticipant.set(g.participant_id, list);
  });

  const gatewayIncomplete: GatewayIncompleteRow[] = rows
    .filter((p) => p.status === "Active")
    .map((p) => {
      const { percent } = getGatewayChecklist({
        participant: p,
        businessPlan: businessPlanByParticipant.get(p.id) ?? null,
        hmrc: hmrcByParticipant.get(p.id) ?? null,
        digitalPresence: digitalPresenceByParticipant.get(p.id) ?? [],
        evidenceFiles: evidenceByParticipant.get(p.id) ?? [],
        manualItems: gatewayItemsByParticipant.get(p.id) ?? [],
      });
      return { participantId: p.id, participantName: p.ptp_name, percent };
    })
    .filter((r) => r.percent < 100)
    .sort((a, b) => b.percent - a.percent);

  // ---- Recent income submissions: entries created since the advisor's last visit ----
  const entries = (incomeRows ?? []) as (Pick<
    IncomeTrackerEntry,
    "participant_id" | "entry_date" | "income" | "expense" | "mileage_cost"
  > & { created_at: string })[];
  const since = lastVisitAt ?? new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const recentIncomeSubmissions: RecentIncomeRow[] = entries
    .filter((e) => e.created_at > since)
    .map((e) => ({
      participantId: e.participant_id,
      participantName: nameById.get(e.participant_id) ?? "Unknown",
      entryDate: e.entry_date,
      netProfit: netProfit(e),
    }));

  // ---- Due for contact: Active participants with no contact in the last 30 days ----
  const appointmentsByParticipant = new Map<string, Appointment[]>();
  (appointmentRows ?? []).forEach((a) => {
    const list = appointmentsByParticipant.get(a.participant_id) ?? [];
    list.push(a);
    appointmentsByParticipant.set(a.participant_id, list);
  });

  const dueForContact: DueForContactRow[] = rows
    .filter((p) => p.status === "Active")
    .map((p) => {
      const appts = appointmentsByParticipant.get(p.id) ?? [];
      const today = todayIso.slice(0, 10);
      const past = appts
        .filter((a) => a.appointment_date <= today)
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
      const lastContactDate = past[0]?.appointment_date ?? null;
      const daysSinceContact = lastContactDate ? daysBetween(lastContactDate, todayIso) : null;
      return { participantId: p.id, participantName: p.ptp_name, lastContactDate, daysSinceContact };
    })
    .filter((r) => r.daysSinceContact === null || r.daysSinceContact > DUE_FOR_CONTACT_DAYS)
    .sort((a, b) => (b.daysSinceContact ?? Infinity) - (a.daysSinceContact ?? Infinity));

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

  return { gatewayIncomplete, recentIncomeSubmissions, dueForContact, recentTradingStarts };
}
