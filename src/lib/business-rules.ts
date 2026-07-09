import { differenceInCalendarDays } from "date-fns";
import {
  BUSINESS_STAGES,
  GATEWAY_MANUAL_CHECKLIST_ITEMS,
  type Appointment,
  type ActionPlanItem,
  type BusinessPlan,
  type BusinessStage,
  type DigitalPresenceItem,
  type EvidenceFile,
  type FundingRecord,
  type GainfulAssessment,
  type GatewayChecklistItem,
  type GatewayChecklistItemName,
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

// ---------------------------------------------------------------------------
// Gateway Readiness: 8 items auto-derived from existing data + 8 manual items.
// ---------------------------------------------------------------------------
export type ChecklistEntry = {
  label: string;
  complete: boolean;
  source: "auto" | "manual";
};

export function getGatewayChecklist({
  participant,
  businessPlan,
  hmrc,
  digitalPresence,
  evidenceFiles,
  manualItems,
}: {
  participant: Participant;
  businessPlan: BusinessPlan | null;
  hmrc: HmrcBusinessInfo | null;
  digitalPresence: DigitalPresenceItem[];
  evidenceFiles: EvidenceFile[];
  manualItems: GatewayChecklistItem[];
}): { entries: ChecklistEntry[]; percent: number } {
  const website = digitalPresence.find((d) => d.platform === "Website");
  const manualByItem = new Map(manualItems.map((m) => [m.item, m.is_complete]));

  const autoEntries: ChecklistEntry[] = [
    { label: "Business Plan", complete: businessPlan?.status === "Complete", source: "auto" },
    { label: "HMRC Registration", complete: !!hmrc?.hmrc_registration_date, source: "auto" },
    { label: "UTR", complete: !!hmrc?.utr_number, source: "auto" },
    { label: "Insurance", complete: !!hmrc?.insurance_status, source: "auto" },
    { label: "Business Bank Account", complete: !!hmrc?.business_bank_account, source: "auto" },
    { label: "Website", complete: !!website?.is_active, source: "auto" },
    { label: "Evidence Uploaded", complete: evidenceFiles.length > 0, source: "auto" },
    {
      label: "Trading Started",
      complete: hasReachedStage(participant.business_stage, "Trading"),
      source: "auto",
    },
  ];

  const manualEntries: ChecklistEntry[] = GATEWAY_MANUAL_CHECKLIST_ITEMS.map(
    (item: GatewayChecklistItemName) => ({
      label: item,
      complete: manualByItem.get(item) ?? false,
      source: "manual",
    }),
  );

  const entries = [...autoEntries, ...manualEntries];
  const percent = Math.round(
    (entries.filter((e) => e.complete).length / entries.length) * 100,
  );

  return { entries, percent };
}

// ---------------------------------------------------------------------------
// Gainful Readiness: 8 evidence factors feed the %; recommendation + sign-off
// are tracked separately since they're the decision itself, not evidence.
// ---------------------------------------------------------------------------
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

export function getGainfulChecklist({
  gainful,
  incomeTrackerEntries,
  evidenceFiles,
  invoicesAvailable,
}: {
  gainful: GainfulAssessment | null;
  incomeTrackerEntries: IncomeTrackerEntry[];
  evidenceFiles: EvidenceFile[];
  invoicesAvailable: boolean;
}): { entries: ChecklistEntry[]; percent: number } {
  const entries: ChecklistEntry[] = [
    { label: "Trading Consistently", complete: !!gainful?.trading_consistently, source: "manual" },
    { label: "Income Trend", complete: getIncomeTrend(incomeTrackerEntries) === "up", source: "auto" },
    { label: "Hours Worked Adequate", complete: !!gainful?.hours_worked_adequate, source: "manual" },
    { label: "Evidence Uploaded", complete: evidenceFiles.length > 0, source: "auto" },
    { label: "Invoices Available", complete: invoicesAvailable, source: "auto" },
    { label: "Bank Statements Provided", complete: !!gainful?.bank_statements_provided, source: "manual" },
    { label: "Customer Base Established", complete: !!gainful?.customer_base_established, source: "manual" },
    { label: "Business Sustainable", complete: !!gainful?.business_sustainable, source: "manual" },
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

  const activePlatforms = digitalPresence.filter((d) => d.is_active).length;
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
    hmrc?.insurance_status ? 100 : 0,
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
