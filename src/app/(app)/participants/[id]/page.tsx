import Link from "next/link";
import { getParticipantDetail } from "@/lib/data/participant";
import { getDaysRemaining } from "@/lib/participant";
import Badge, { statusTone } from "@/components/badge";
import Tabs from "@/components/tabs";
import DeleteParticipantButton from "@/components/participant/delete-participant-button";
import BusinessPlanTab from "@/components/participant/business-plan-tab";
import MonthlyEarningsTab from "@/components/participant/monthly-earnings-tab";
import EvidenceLibraryTab from "@/components/participant/evidence-library-tab";
import ActionPlanTab from "@/components/participant/action-plan-tab";
import AppointmentsTab from "@/components/participant/appointments-tab";

export default async function ParticipantProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const {
    participant,
    businessPlan,
    monthlyEarnings,
    evidenceFiles,
    actionPlanItems,
    appointments,
  } = await getParticipantDetail(id);

  const daysRemaining = getDaysRemaining(participant.scheme_start_date);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/participants"
          className="text-sm text-slate-500 hover:text-indigo-600"
        >
          ← Back to participants
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {participant.ptp_name}
            </h1>
            <p className="text-sm text-slate-500">{participant.business_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/participants/${id}/edit`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit
            </Link>
            <DeleteParticipantButton participantId={id} />
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
              id: "monthly-earnings",
              label: "Monthly Earnings",
              content: (
                <MonthlyEarningsTab
                  participantId={id}
                  earnings={monthlyEarnings}
                />
              ),
            },
            {
              id: "evidence",
              label: "Evidence Library",
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
                <AppointmentsTab participantId={id} appointments={appointments} />
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
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}
