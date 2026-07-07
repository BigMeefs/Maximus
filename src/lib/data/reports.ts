import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { getGatewayChecklist } from "@/lib/business-rules";
import { FUNDING_APPLICATION_STATUSES } from "@/types/database";
import type {
  BusinessPlan,
  BusinessStage,
  DigitalPresenceItem,
  EvidenceFile,
  FundingApplicationStatus,
  GainfulRecommendation,
  GatewayChecklistItem,
  HmrcBusinessInfo,
  Participant,
  RagStatus,
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
