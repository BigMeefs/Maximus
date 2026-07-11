import type {
  ActionPlanItem,
  Appointment,
  BusinessPlan,
  EvidenceFile,
  FundingRecord,
  GatewayReadiness,
  HmrcBusinessInfo,
  IncomeTrackerEntry,
  Participant,
} from "@/types/database";
import {
  getGatewayReadinessChecklist,
  getOutstandingActions,
  getOverdueActions,
  hasReachedStage,
} from "@/lib/business-rules";

export type NextBestActionContext = {
  participant: Participant;
  businessPlan: BusinessPlan | null;
  hmrc: HmrcBusinessInfo | null;
  evidenceFiles: EvidenceFile[];
  fundingRecords: FundingRecord[];
  incomeTrackerEntries: IncomeTrackerEntry[];
  actionItems: ActionPlanItem[];
  appointments: Appointment[];
  readiness: GatewayReadiness | null;
};

export type NextBestAction = {
  action: string;
  reason: string;
};

/**
 * Deterministic recommendation engine: inspects every signal the toolkit
 * tracks and returns the single highest-priority next step, in roughly the
 * order a participant naturally needs to clear them (plan -> register ->
 * trade -> evidence -> Gateway Readiness -> Gateway booking/outcome),
 * falling back to relationship upkeep (overdue actions, contact) when the
 * business track is on course.
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

  const readiness = getGatewayReadinessChecklist({
    readiness: ctx.readiness,
    incomeTrackerEntries: ctx.incomeTrackerEntries,
    evidenceFiles: ctx.evidenceFiles,
  });

  if (
    ctx.participant.gateway_booked_status === "Not Booked" &&
    readiness.percent >= 90
  ) {
    return {
      action: "Book the Gateway appointment.",
      reason: `Gateway Readiness is at ${readiness.percent}%.`,
    };
  }

  const incompleteReadinessItems = readiness.entries.filter((e) => !e.complete);
  if (
    ctx.participant.gateway_booked_status !== "Completed" &&
    incompleteReadinessItems.length > 0
  ) {
    return {
      action: `Complete outstanding Gateway Readiness items: ${incompleteReadinessItems
        .slice(0, 3)
        .map((e) => e.label)
        .join(", ")}.`,
      reason: `Gateway Readiness is at ${readiness.percent}%.`,
    };
  }

  if (ctx.participant.gateway_booked_status === "Completed" && !ctx.participant.gateway_outcome) {
    return {
      action: "Record the Gateway Outcome.",
      reason: "The Gateway appointment has taken place but the outcome (GSE or NGSE) hasn't been recorded yet.",
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
