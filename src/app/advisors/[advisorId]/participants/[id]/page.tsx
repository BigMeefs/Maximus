import Link from "next/link";
import { getParticipantDetail } from "@/lib/data/participant";
import { getDaysRemaining } from "@/lib/participant";
import Badge, { statusTone } from "@/components/badge";
import Tabs from "@/components/tabs";
import DeleteParticipantButton from "@/components/participant/delete-participant-button";
import BusinessPlanTab from "@/components/participant/business-plan-tab";
import IncomeTrackerTab from "@/components/participant/income-tracker-tab";
import EvidenceLibraryTab from "@/components/participant/evidence-library-tab";
import ActionPlanTab from "@/components/participant/action-plan-tab";
import AppointmentsTab from "@/components/participant/appointments-tab";
import JourneyTab from "@/components/participant/journey-tab";
import StatusBadge from "@/components/participant/status-badge";
import StatusTimeline from "@/components/participant/status-timeline";
import TradingStartTab from "@/components/participant/trading-start-tab";
import HealthBadge from "@/components/participant/health-badge";
import { computeParticipantHealth } from "@/lib/participant-health";
import GatewayCombinedTab from "@/components/participant/gateway-combined-tab";
import FundingTab from "@/components/participant/funding-tab";
import HmrcTab from "@/components/participant/hmrc-tab";
import DigitalPresenceTab from "@/components/participant/digital-presence-tab";
import AiAssistantTab from "@/components/participant/ai-assistant-tab";
import SelfEmploymentOverview from "@/components/participant/self-employment-overview";
import NextBestActionPanel from "@/components/participant/next-best-action-panel";
import HealthScorePanel from "@/components/participant/health-score-panel";
import { deleteParticipant } from "@/app/advisors/[advisorId]/participants/actions";
import {
  getBusinessHealthScores,
  getDaysUntilGateway,
  getGainfulChecklist,
  getGatewayChecklist,
  getLastContactDate,
  getNextAppointment,
  getOutstandingActions,
  getSuggestedRag,
} from "@/lib/business-rules";
import { getNextBestAction } from "@/lib/next-best-action";

export default async function ParticipantProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ advisorId: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { advisorId, id } = await params;
  const { tab } = await searchParams;
  const basePath = `/advisors/${advisorId}/participants`;

  const {
    participant,
    assignedAdvisor,
    advisors,
    businessPlan,
    evidenceFiles,
    actionPlanItems,
    appointments,
    fundingRecords,
    hmrc,
    digitalPresence,
    gatewayChecklist,
    gainful,
    incomeTrackerEntries,
    statusHistory,
    currentTradingStart,
    iwtReviews,
    outcome,
    programmeSettings,
  } = await getParticipantDetail(id);

  const daysRemaining = getDaysRemaining(participant.scheme_start_date);
  const boundDelete = deleteParticipant.bind(null, advisorId, id);

  const health =
    currentTradingStart && !outcome
      ? computeParticipantHealth(currentTradingStart, incomeTrackerEntries, iwtReviews, programmeSettings)
      : null;

  const gateway = getGatewayChecklist({
    participant,
    businessPlan,
    hmrc,
    digitalPresence,
    evidenceFiles,
    manualItems: gatewayChecklist,
  });

  const invoicesAvailable =
    gateway.entries.find((e) => e.label === "Invoices Available")?.complete ?? false;

  const gainfulChecklist = getGainfulChecklist({
    gainful,
    incomeTrackerEntries,
    evidenceFiles,
    invoicesAvailable,
  });

  const healthScores = getBusinessHealthScores({
    participant,
    businessPlan,
    hmrc,
    digitalPresence,
    fundingRecords,
    incomeTrackerEntries,
    manualGatewayItems: gatewayChecklist,
  });

  const suggestedRag = getSuggestedRag({ appointments, actionItems: actionPlanItems });
  const daysUntilGateway = getDaysUntilGateway(participant);
  const nextAppointment = getNextAppointment(appointments);
  const lastContactDate = getLastContactDate(appointments);
  const outstandingActions = getOutstandingActions(actionPlanItems);

  const nextBestAction = getNextBestAction({
    participant,
    businessPlan,
    hmrc,
    digitalPresence,
    evidenceFiles,
    manualGatewayItems: gatewayChecklist,
    fundingRecords,
    incomeTrackerEntries,
    actionItems: actionPlanItems,
    appointments,
    gainful,
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={basePath}
          className="text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Back to participants
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">
                {participant.ptp_name}
              </h1>
              {participant.iconi_id && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Iconi ID: {participant.iconi_id}
                </span>
              )}
              <StatusBadge status={participant.status} />
              {health && <HealthBadge tone={health.tone} label={health.label} />}
            </div>
            <p className="text-sm text-slate-500">{participant.business_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`${basePath}/${id}/edit`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
            <DeleteParticipantButton action={boundDelete} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Info label="Days remaining">
            <Badge tone={daysRemaining <= 0 ? "red" : daysRemaining <= 30 ? "amber" : "slate"}>
              {daysRemaining <= 0 ? "Expired" : `${daysRemaining} days`}
            </Badge>
          </Info>
          <Info label="Scheme start date">
            {new Date(participant.scheme_start_date).toLocaleDateString()}
          </Info>
          <Info label="Advisor">{assignedAdvisor?.full_name ?? "Unknown"}</Info>
          <Info label="Office">{assignedAdvisor?.office_name ?? "Unknown"}</Info>
          <Info label="Email">{participant.email || "—"}</Info>
          <Info label="Previous advisor">
            {participant.previous_advisor || "—"}
          </Info>
          <Info label="Business plan">
            <Badge tone={statusTone(businessPlan?.status ?? "Not Started")}>
              {businessPlan?.status ?? "Not Started"}
            </Badge>
          </Info>
          <Info label="Website">
            {participant.website ? (
              <a
                href={participant.website}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                {participant.website}
              </a>
            ) : (
              "—"
            )}
          </Info>
          <Info label="Social media" className="sm:col-span-2 lg:col-span-2">
            {participant.social_media_links || "—"}
          </Info>
        </dl>
      </div>

      <NextBestActionPanel recommendation={nextBestAction} />

      <SelfEmploymentOverview
        participant={participant}
        gatewayPercent={gateway.percent}
        gainfulPercent={gainfulChecklist.percent}
        daysUntilGateway={daysUntilGateway}
        nextAppointment={nextAppointment}
        outstandingActionsCount={outstandingActions.length}
        lastContactDate={lastContactDate}
        suggestedRag={suggestedRag}
      />

      <HealthScorePanel participantId={id} scores={healthScores} />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Tabs
          initialTab={tab}
          tabs={[
            {
              id: "business-plan",
              label: "Business Plan",
              content: (
                <BusinessPlanTab participantId={id} businessPlan={businessPlan} />
              ),
            },
            {
              id: "journey",
              label: "Journey",
              content: (
                <JourneyTab
                  participantId={id}
                  currentStage={participant.business_stage}
                  stageUpdatedAt={participant.business_stage_updated_at}
                />
              ),
            },
            {
              id: "trading-start",
              label: "Trading Start & IWT",
              content: (
                <TradingStartTab
                  participantId={id}
                  advisorId={advisorId}
                  advisors={advisors}
                  participant={participant}
                  incomeTrackerEntries={incomeTrackerEntries}
                  currentTradingStart={currentTradingStart}
                  iwtReviews={iwtReviews}
                  outcome={outcome}
                  settings={programmeSettings}
                />
              ),
            },
            {
              id: "status-history",
              label: "Status History",
              content: <StatusTimeline history={statusHistory} />,
            },
            {
              id: "gateway",
              label: "Gateway",
              content: (
                <GatewayCombinedTab
                  participantId={id}
                  gatewayEntries={gateway.entries}
                  gatewayPercent={gateway.percent}
                  gatewayTargetDate={participant.gateway_target_date}
                  gatewayNotes={participant.gateway_notes}
                  gainfulEntries={gainfulChecklist.entries}
                  gainfulPercent={gainfulChecklist.percent}
                  gainful={gainful}
                  evidenceFiles={evidenceFiles}
                />
              ),
            },
            {
              id: "funding",
              label: "Funding",
              content: <FundingTab participantId={id} records={fundingRecords} />,
            },
            {
              id: "income-tracker",
              label: "Income Tracker",
              content: (
                <IncomeTrackerTab
                  participantId={id}
                  entries={incomeTrackerEntries}
                  tradingStart={currentTradingStart}
                  settings={programmeSettings}
                />
              ),
            },
            {
              id: "hmrc",
              label: "HMRC & Business",
              content: <HmrcTab participantId={id} hmrc={hmrc} />,
            },
            {
              id: "digital-presence",
              label: "Digital Presence",
              content: (
                <DigitalPresenceTab participantId={id} items={digitalPresence} />
              ),
            },
            {
              id: "evidence",
              label: "Evidence Vault",
              content: (
                <EvidenceLibraryTab participantId={id} files={evidenceFiles} />
              ),
            },
            {
              id: "action-plan",
              label: "Action Plan",
              content: (
                <ActionPlanTab participantId={id} items={actionPlanItems} />
              ),
            },
            {
              id: "appointments",
              label: "Appointment History",
              content: (
                <AppointmentsTab
                  participantId={id}
                  appointments={appointments}
                  advisors={advisors}
                  defaultAdvisorId={advisorId}
                />
              ),
            },
            {
              id: "ai-assistant",
              label: "AI Assistant",
              content: (
                <AiAssistantTab
                  participantId={id}
                  participant={participant}
                  businessPlan={businessPlan}
                  gatewayPercent={gateway.percent}
                  gainfulPercent={gainfulChecklist.percent}
                  incompleteGatewayItems={gateway.entries
                    .filter((e) => !e.complete)
                    .map((e) => e.label)}
                  incompleteGainfulItems={gainfulChecklist.entries
                    .filter((e) => !e.complete)
                    .map((e) => e.label)}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}
