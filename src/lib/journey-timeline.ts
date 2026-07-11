import type {
  BusinessPlan,
  GatewayChecklistItem,
  OutcomeRecord,
  Participant,
  ParticipantStatusHistoryEntry,
  TradingStart,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Participant Journey Timeline — a curated, milestone-based view of a
// participant's progress, built by reading records that already exist
// elsewhere in the CRM (status history, appointments, business plan,
// Gateway checklist, Trading Start, Outcome). Nothing here is stored;
// every milestone is derived live, so it updates automatically the moment
// the underlying record changes (a Trading Start is confirmed, an Outcome
// is recorded, etc.) with no extra wiring.
//
// To add a milestone in future: add one more entry to MILESTONE_BUILDERS
// below with an id/label and a function computing { completed, date,
// summary, detail }. Nothing else about the timeline needs to change —
// the sequential completed/current/upcoming pass and the rendering
// component both iterate the list generically.
// ---------------------------------------------------------------------------

export type MilestoneDetailItem = { label: string; value: string };

export type MilestoneStatus = "completed" | "current" | "upcoming";

export type JourneyMilestone = {
  id: string;
  label: string;
  status: MilestoneStatus;
  /** True once satisfied but not through a real event (e.g. a Trading Start that never transferred to a different IWT advisor). Rendered as "Not required" rather than a checkmark. */
  notApplicable?: boolean;
  /** True for a milestone that resolved unfavourably (e.g. Outcome not achieved). Rendered in red rather than green. */
  negative?: boolean;
  date: string | null;
  summary: string;
  detail: MilestoneDetailItem[];
};

export type JourneyTimelineInput = {
  participant: Participant;
  statusHistory: ParticipantStatusHistoryEntry[];
  businessPlan: BusinessPlan | null;
  gatewayPercent: number;
  gatewayChecklistItems: GatewayChecklistItem[];
  currentTradingStart: TradingStart | null;
  outcome: OutcomeRecord | null;
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB");
}

type RawMilestone = Omit<JourneyMilestone, "status">;

const MILESTONE_BUILDERS: ((input: JourneyTimelineInput) => RawMilestone)[] = [
  // 1. Referral Received
  ({ participant, statusHistory }) => {
    const referralEntry = [...statusHistory]
      .reverse()
      .find((h) => h.to_status === "Referral");
    const date = referralEntry?.created_at ?? participant.created_at;
    return {
      id: "referral-received",
      label: "Referral Received",
      date,
      summary: `Referred on ${formatDate(date)}.`,
      detail: [
        { label: "Date", value: formatDate(date) },
        { label: "Logged by", value: referralEntry?.changed_by ?? "—" },
        { label: "Notes", value: referralEntry?.notes ?? "—" },
      ],
    };
  },
  // 2. Business Plan
  ({ businessPlan }) => {
    const completed = businessPlan?.status === "Complete";
    return {
      id: "business-plan",
      label: "Business Plan",
      date: completed ? businessPlan!.updated_at : null,
      summary: completed
        ? `Completed ${formatDate(businessPlan!.updated_at)}.`
        : `Status: ${businessPlan?.status ?? "Not Started"}.`,
      detail: [
        { label: "Status", value: businessPlan?.status ?? "Not Started" },
        { label: "Last updated", value: businessPlan ? formatDate(businessPlan.updated_at) : "—" },
        { label: "Document", value: businessPlan?.file_name ?? "None uploaded — see the Business Plan tab." },
      ],
    };
  },
  // 3. Gateway
  ({ gatewayPercent, gatewayChecklistItems }) => {
    const completed = gatewayPercent >= 100;
    const lastUpdated = gatewayChecklistItems.length
      ? gatewayChecklistItems.reduce((latest, item) => (item.updated_at > latest ? item.updated_at : latest), gatewayChecklistItems[0].updated_at)
      : null;
    return {
      id: "gateway",
      label: "Gateway",
      date: completed ? lastUpdated : null,
      summary: completed ? `Gateway complete.` : `${gatewayPercent}% of the Gateway checklist complete.`,
      detail: [
        { label: "Readiness", value: `${gatewayPercent}%` },
        { label: "Last checklist update", value: lastUpdated ? formatDate(lastUpdated) : "—" },
        { label: "Full checklist", value: "See the Gateway tab for every item and Advisor Notes." },
      ],
    };
  },
  // 4. Trading Start
  ({ currentTradingStart }) => ({
    id: "trading-start",
    label: "Trading Start",
    date: currentTradingStart?.trading_start_date ?? null,
    summary: currentTradingStart
      ? `Trading Start confirmed ${formatDate(currentTradingStart.trading_start_date)} (${currentTradingStart.reason}).`
      : "Not yet confirmed.",
    detail: currentTradingStart
      ? [
          { label: "Date", value: formatDate(currentTradingStart.trading_start_date) },
          { label: "Reason", value: currentTradingStart.reason },
          { label: "Evidence / notes", value: currentTradingStart.evidence_notes ?? "—" },
        ]
      : [{ label: "Status", value: "Awaiting eligibility — see the Trading Start & IWT tab." }],
  }),
  // 5. Transfer to IWT
  ({ currentTradingStart }) => {
    const transferred = !!currentTradingStart && currentTradingStart.iwt_advisor_id !== currentTradingStart.original_advisor_id;
    const notRequired = !!currentTradingStart && !transferred;
    return {
      id: "transfer-to-iwt",
      label: "Transfer to IWT",
      notApplicable: notRequired,
      date: transferred ? currentTradingStart!.transfer_date : null,
      summary: transferred
        ? `Transferred to an IWT advisor ${formatDate(currentTradingStart!.transfer_date)}.`
        : notRequired
          ? "Not required — supported by the same advisor throughout."
          : "Not yet applicable.",
      detail: transferred
        ? [{ label: "Transfer date", value: formatDate(currentTradingStart!.transfer_date) }]
        : [{ label: "Status", value: notRequired ? "No transfer needed for this participant." : "—" }],
    };
  },
  // 6. In Work Tracking
  ({ currentTradingStart, participant }) => ({
    id: "in-work-tracking",
    label: "In Work Tracking",
    date: currentTradingStart?.trading_start_date ?? null,
    summary: currentTradingStart
      ? `In Work Tracking since ${formatDate(currentTradingStart.trading_start_date)}.`
      : `Current status: ${participant.status}.`,
    detail: currentTradingStart
      ? [{ label: "Tracking since", value: formatDate(currentTradingStart.trading_start_date) }, { label: "Reviews", value: "See the Trading Start & IWT tab for the full review log." }]
      : [{ label: "Status", value: "Begins automatically once a Trading Start is confirmed." }],
  }),
  // 7. Outcome Achieved
  ({ outcome }) => ({
    id: "outcome-achieved",
    label: "Outcome Achieved",
    negative: !!outcome && !outcome.outcome_achieved,
    date: outcome?.outcome_date ?? null,
    summary: outcome
      ? outcome.outcome_achieved
        ? `Outcome achieved ${formatDate(outcome.outcome_date)}.`
        : `Outcome recorded ${formatDate(outcome.outcome_date)} — not achieved.`
      : "Not yet recorded.",
    detail: outcome
      ? [
          { label: "Date", value: formatDate(outcome.outcome_date) },
          { label: "Achieved", value: outcome.outcome_achieved ? "Yes" : "No" },
          { label: "Evidence", value: outcome.evidence ?? "—" },
          { label: "Advisor notes", value: outcome.advisor_notes ?? "—" },
        ]
      : [{ label: "Status", value: "Recorded once the Outcome criteria are met — see the Trading Start & IWT tab." }],
  }),
];

// Whether a raw milestone counts as "done" for the purposes of walking the
// sequence — every builder above sets a real date once satisfied, except
// the ones that are explicitly notApplicable (auto-satisfied) or otherwise
// have no date but are still resolved (e.g. Outcome recorded but not
// achieved, which has a date). A milestone is "done" if it has a date, or
// is marked notApplicable.
function isDone(m: RawMilestone): boolean {
  return !!m.date || !!m.notApplicable;
}

export function computeJourneyTimeline(input: JourneyTimelineInput): JourneyMilestone[] {
  const raw = MILESTONE_BUILDERS.map((build) => build(input));

  let currentAssigned = false;
  return raw.map((m) => {
    const done = isDone(m);
    let status: MilestoneStatus;
    if (done) {
      status = "completed";
    } else if (!currentAssigned) {
      currentAssigned = true;
      status = "current";
    } else {
      status = "upcoming";
    }
    return { ...m, status };
  });
}
