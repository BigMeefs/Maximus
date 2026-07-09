import type {
  ActionPlanItem,
  Appointment,
  BusinessPlan,
  DigitalPresenceItem,
  EvidenceFile,
  FundingRecord,
  GainfulAssessment,
  GatewayChecklistItem,
  HmrcBusinessInfo,
  IncomeTrackerEntry,
  Participant,
} from "@/types/database";
import {
  getGatewayChecklist,
  getGainfulChecklist,
  getOutstandingActions,
  getOverdueActions,
  hasReachedStage,
} from "@/lib/business-rules";

export type NextBestActionContext = {
  participant: Participant;
  businessPlan: BusinessPlan | null;
  hmrc: HmrcBusinessInfo | null;
  digitalPresence: DigitalPresenceItem[];
  evidenceFiles: EvidenceFile[];
  manualGatewayItems: GatewayChecklistItem[];
  fundingRecords: FundingRecord[];
  incomeTrackerEntries: IncomeTrackerEntry[];
  actionItems: ActionPlanItem[];
  appointments: Appointment[];
  gainful: GainfulAssessment | null;
};

export type NextBestAction = {
  action: string;
  reason: string;
};

/**
 * Deterministic recommendation engine: inspects every signal the toolkit
 * tracks and returns the single highest-priority next step, in roughly the
 * order a participant naturally needs to clear them (plan -> register ->
 * trade -> evidence -> gateway -> gainful), falling back to relationship
 * upkeep (overdue actions, contact) when the business track is on course.
 */
export function getNextBestAction(ctx: NextBestActionContext): NextBestAction {
  const overdue = getOverdueActions(ctx.actionItems);
  if (overdue.length > 0) {
    return {
      action: `Follow up on the overdue action: "${overdue[0].description}".`,
      reason: `${overdue.length} action${overdue.length > 1 ? "s are" : " is"} past its target date.`,
    };
  }

  if (!ctx.businessPlan || ctx.businessPlan.status === "Not Started") {
    return {
      action: "Start the Business Plan.",
      reason: "No business plan has been started yet.",
    };
  }

  if (ctx.businessPlan.status === "In Progress") {
    return {
      action: "Complete the Business Plan.",
      reason: "The business plan is in progress but not yet marked complete.",
    };
  }

  if (!ctx.hmrc?.utr_number) {
    return {
      action: "Register for a UTR.",
      reason: "No UTR number is recorded in HMRC & Business Information.",
    };
  }

  const gateway = getGatewayChecklist({
    participant: ctx.participant,
    businessPlan: ctx.businessPlan,
    hmrc: ctx.hmrc,
    digitalPresence: ctx.digitalPresence,
    evidenceFiles: ctx.evidenceFiles,
    manualItems: ctx.manualGatewayItems,
  });

  const missingCashflow = gateway.entries.find(
    (e) => e.label === "Cashflow Forecast" && !e.complete,
  );
  if (missingCashflow) {
    return {
      action: "Complete the Cashflow Forecast.",
      reason: "The Cashflow Forecast is still outstanding on the Gateway checklist.",
    };
  }

  const missingMarketing = gateway.entries.find(
    (e) => e.label === "Marketing Plan" && !e.complete,
  );
  if (missingMarketing) {
    return {
      action: "Create a Marketing Plan.",
      reason: "The Marketing Plan is still outstanding on the Gateway checklist.",
    };
  }

  if (
    hasReachedStage(ctx.participant.business_stage, "Trading") &&
    ctx.evidenceFiles.length === 0
  ) {
    return {
      action: "Upload evidence of trading.",
      reason: "Trading has started but no evidence has been uploaded to the vault.",
    };
  }

  if (
    hasReachedStage(ctx.participant.business_stage, "Financial Planning") &&
    ctx.fundingRecords.length === 0
  ) {
    return {
      action: "Apply for funding.",
      reason: "No funding applications are on record yet.",
    };
  }

  if (
    gateway.percent >= 90 &&
    !hasReachedStage(ctx.participant.business_stage, "Gateway Preparation")
  ) {
    return {
      action: "Schedule Gateway Assessment.",
      reason: `Gateway readiness is at ${gateway.percent}%.`,
    };
  }

  const incompleteGatewayItems = gateway.entries.filter((e) => !e.complete);
  if (
    ctx.participant.business_stage === "Gateway Preparation" &&
    incompleteGatewayItems.length > 0
  ) {
    return {
      action: `Complete outstanding Gateway items: ${incompleteGatewayItems
        .slice(0, 3)
        .map((e) => e.label)
        .join(", ")}.`,
      reason: `Gateway readiness is at ${gateway.percent}%.`,
    };
  }

  if (
    hasReachedStage(ctx.participant.business_stage, "Gateway Complete") &&
    gateway.percent >= 100
  ) {
    const gainful = getGainfulChecklist({
      gainful: ctx.gainful,
      incomeTrackerEntries: ctx.incomeTrackerEntries,
      evidenceFiles: ctx.evidenceFiles,
      invoicesAvailable:
        gateway.entries.find((e) => e.label === "Invoices Available")?.complete ?? false,
    });

    if (gainful.percent >= 90) {
      return {
        action: "Participant appears ready for a Gainful decision.",
        reason: `Gainful readiness evidence is at ${gainful.percent}%.`,
      };
    }

    const incompleteGainfulItems = gainful.entries.filter((e) => !e.complete);
    if (incompleteGainfulItems.length > 0) {
      return {
        action: `Gather outstanding Gainful evidence: ${incompleteGainfulItems
          .slice(0, 3)
          .map((e) => e.label)
          .join(", ")}.`,
        reason: `Gainful readiness evidence is at ${gainful.percent}%.`,
      };
    }
  }

  if (gateway.percent >= 100 && !hasReachedStage(ctx.participant.business_stage, "Gateway Preparation")) {
    return {
      action: "Participant appears Gateway Ready.",
      reason: "All Gateway checklist items are complete.",
    };
  }

  const outstanding = getOutstandingActions(ctx.actionItems);
  if (outstanding.length > 0) {
    return {
      action: `Progress the open action: "${outstanding[0].description}".`,
      reason: `${outstanding.length} action${outstanding.length > 1 ? "s remain" : " remains"} open.`,
    };
  }

  return {
    action: "Schedule the next appointment to review progress.",
    reason: "No urgent gaps found — keep the momentum going.",
  };
}
