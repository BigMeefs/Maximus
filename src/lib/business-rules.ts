import { differenceInCalendarDays } from "date-fns";
import {
  BUSINESS_STAGES,
  type Appointment,
  type ActionPlanItem,
  type BusinessPlan,
  type BusinessStage,
  type DigitalPresenceItem,
  type EvidenceFile,
  type FundingRecord,
  type GatewayChecklistItem,
  type GatewayReadiness,
  type HmrcBusinessInfo,
  type IncomeTrackerEntry,
  type Participant,
  type RagStatus,
} from "@/types/database";
import { netProfit } from "@/lib/trading-start-rules";

export function stageIndex(stage: BusinessStage): number {
  return BUSINESS_STAGES.indexOf(stage);
}

export function hasReachedStage(current: BusinessStage, target: BusinessStage) {
  return stageIndex(current) >= stageIndex(target);
}

// A platform counts as "done" for both progress % and Business Health Score
// purposes if it's genuinely Complete, or if the advisor has explicitly
// recorded it as Not Needed for this business — Not Needed is a considered
// answer, not a gap, so it shouldn't drag a participant's readiness down.
export function isDigitalPresenceDone(item: Pick<DigitalPresenceItem, "status"> | undefined): boolean {
  return item?.status === "Complete" || item?.status === "Not Needed";
}

// ---------------------------------------------------------------------------
// Gateway Readiness — a purely advisor-facing checklist that prepares a
// participant for their Universal Credit Gateway appointment. It carries no
// weight of its own toward any official decision: UC alone decides GSE vs
// NGSE (see participants.gateway_outcome). This replaces what used to be
// two separate checklists (a "Gateway Assessment" and a "Gainful Decision")
// with the one list the team actually works from day to day.
// ---------------------------------------------------------------------------
export type ChecklistEntry = {
  label: string;
  complete: boolean;
  source: "auto" | "manual";
};

export function getIncomeTrend(entries: IncomeTrackerEntry[]): "up" | "flat" | "down" | "unknown" {
  const sorted = [...entries].sort((a, b) => a.month.localeCompare(b.month));
  if (sorted.length < 2) return "unknown";

  const profits = sorted.map((e) => netProfit(e));
  const half = Math.max(1, Math.floor(profits.length / 2));
  const recent = profits.slice(-half);
  const earlier = profits.slice(0, profits.length - half);
  if (earlier.length === 0) return "unknown";

  const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
  const recentAvg = avg(recent);
  const earlierAvg = avg(earlier);

  if (recentAvg > earlierAvg * 1.05) return "up";
  if (recentAvg < earlierAvg * 0.95) return "down";
  return "flat";
}

export function getGatewayReadinessChecklist({
  readiness,
  incomeTrackerEntries,
  evidenceFiles,
}: {
  readiness: GatewayReadiness | null;
  incomeTrackerEntries: IncomeTrackerEntry[];
  evidenceFiles: EvidenceFile[];
}): { entries: ChecklistEntry[]; percent: number } {
  const entries: ChecklistEntry[] = [
    { label: "Trading Consistently", complete: !!readiness?.trading_consistently, source: "manual" },
    { label: "Positive Income Trend", complete: getIncomeTrend(incomeTrackerEntries) === "up", source: "auto" },
    { label: "Hours Worked Adequately", complete: !!readiness?.hours_worked_adequate, source: "manual" },
    { label: "Evidence Uploaded", complete: evidenceFiles.length > 0, source: "auto" },
    { label: "Invoices Available", complete: !!readiness?.invoices_available, source: "manual" },
    { label: "Customer Base Established", complete: !!readiness?.customer_base_established, source: "manual" },
    { label: "Business Appears Sustainable", complete: !!readiness?.business_sustainable, source: "manual" },
    { label: "Expected To Make A Profit", complete: !!readiness?.expected_to_make_profit, source: "manual" },
  ];

  const percent = Math.round(
    (entries.filter((e) => e.complete).length / entries.length) * 100,
  );

  return { entries, percent };
}

// ---------------------------------------------------------------------------
// Business Health Score: 8 categories, 0-100. Confidence is the only manual
// input (an advisor judgement call); the rest are computed from other data.
// ---------------------------------------------------------------------------
export type HealthScores = {
  planning: number;
  finance: number;
  marketing: number;
  trading: number;
  legal: number;
  digitalPresence: number;
  confidence: number;
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function getBusinessHealthScores({
  participant,
  businessPlan,
  hmrc,
  digitalPresence,
  fundingRecords,
  incomeTrackerEntries,
  manualGatewayItems,
}: {
  participant: Participant;
  businessPlan: BusinessPlan | null;
  hmrc: HmrcBusinessInfo | null;
  digitalPresence: DigitalPresenceItem[];
  fundingRecords: FundingRecord[];
  incomeTrackerEntries: IncomeTrackerEntry[];
  manualGatewayItems: GatewayChecklistItem[];
}): HealthScores {
  const manualByItem = new Map(manualGatewayItems.map((m) => [m.item, m.is_complete]));
  const planScore = (status: BusinessPlan["status"] | undefined) =>
    status === "Complete" ? 100 : status === "In Progress" ? 50 : 0;

  const planning = average([
    planScore(businessPlan?.status),
    manualByItem.get("Market Research") ? 100 : 0,
    manualByItem.get("Cashflow Forecast") ? 100 : 0,
    manualByItem.get("Pricing") ? 100 : 0,
  ]);

  const totalReceived = fundingRecords.reduce(
    (sum, f) => sum + (Number(f.amount_received) || 0),
    0,
  );
  const incomeTrend = getIncomeTrend(incomeTrackerEntries);
  const finance = average([
    hmrc?.business_bank_account ? 100 : 0,
    totalReceived > 0 ? 100 : fundingRecords.length > 0 ? 40 : 0,
    incomeTrend === "up" ? 100 : incomeTrend === "flat" ? 60 : incomeTrend === "down" ? 20 : 0,
  ]);

  const activePlatforms = digitalPresence.filter((d) => isDigitalPresenceDone(d)).length;
  const digitalPresenceScore = Math.round(
    (activePlatforms / DIGITAL_PLATFORM_COUNT) * 100,
  );
  const marketing = average([
    manualByItem.get("Marketing Plan") ? 100 : 0,
    manualByItem.get("Branding") ? 100 : 0,
    manualByItem.get("Social Media") ? 100 : 0,
    digitalPresenceScore,
  ]);

  const trading = hasReachedStage(participant.business_stage, "Trading")
    ? average([100, incomeTrackerEntries.length > 0 ? 100 : 40])
    : Math.round((stageIndex(participant.business_stage) / (BUSINESS_STAGES.length - 1)) * 100);

  const legal = average([
    hmrc?.insurance_in_place ? 100 : 0,
    hmrc?.utr_number ? 100 : 0,
    hmrc?.business_structure ? 100 : 0,
    hmrc?.business_bank_account ? 100 : 0,
  ]);

  return {
    planning,
    finance,
    marketing,
    trading,
    legal,
    digitalPresence: digitalPresenceScore,
    confidence: participant.health_confidence ?? 50,
  };
}

const DIGITAL_PLATFORM_COUNT = 9;

// ---------------------------------------------------------------------------
// Appointments / actions derived facts
// ---------------------------------------------------------------------------
export function getNextAppointment(appointments: Appointment[]): Appointment | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = appointments
    .filter((a) => a.appointment_date >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  return upcoming[0] ?? null;
}

export function getLastContactDate(appointments: Appointment[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const past = appointments
    .filter((a) => a.appointment_date <= today)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
  return past[0]?.appointment_date ?? null;
}

export function getOutstandingActions(items: ActionPlanItem[]): ActionPlanItem[] {
  return items.filter((i) => i.status !== "Complete");
}

export function getOverdueActions(items: ActionPlanItem[]): ActionPlanItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return getOutstandingActions(items).filter(
    (i) => i.target_date && i.target_date < today,
  );
}

export function getDaysUntilGateway(participant: Participant): number | null {
  if (!participant.gateway_target_date) return null;
  return differenceInCalendarDays(
    new Date(participant.gateway_target_date),
    new Date(),
  );
}

// ---------------------------------------------------------------------------
// RAG suggestion: flags missing evidence / inactivity, doesn't override the
// advisor's manually-set status.
// ---------------------------------------------------------------------------
export function getSuggestedRag({
  appointments,
  actionItems,
}: {
  appointments: Appointment[];
  actionItems: ActionPlanItem[];
}): RagStatus {
  const lastContact = getLastContactDate(appointments);
  const daysSinceContact = lastContact
    ? differenceInCalendarDays(new Date(), new Date(lastContact))
    : null;

  let score = 0;
  if (daysSinceContact === null || daysSinceContact > 45) score += 2;
  else if (daysSinceContact > 21) score += 1;

  const outstanding = getOutstandingActions(actionItems).length;
  if (outstanding >= 3) score += 2;
  else if (outstanding >= 1) score += 1;

  if (getOverdueActions(actionItems).length > 0) score += 2;

  if (score >= 4) return "Red";
  if (score >= 2) return "Amber";
  return "Green";
}
