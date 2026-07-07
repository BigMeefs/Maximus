import Badge, { statusTone } from "@/components/badge";
import RagSelector from "@/components/participant/rag-selector";
import clsx from "clsx";
import type { Appointment, Participant, RagStatus } from "@/types/database";

function ProgressCard({
  label,
  percent,
}: {
  label: string;
  percent: number;
}) {
  const tone = percent >= 90 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{percent}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full transition-all", tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

export default function SelfEmploymentOverview({
  participant,
  gatewayPercent,
  gainfulPercent,
  daysUntilGateway,
  nextAppointment,
  outstandingActionsCount,
  lastContactDate,
  suggestedRag,
}: {
  participant: Participant;
  gatewayPercent: number;
  gainfulPercent: number;
  daysUntilGateway: number | null;
  nextAppointment: Appointment | null;
  outstandingActionsCount: number;
  lastContactDate: string | null;
  suggestedRag: RagStatus;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              RAG Status
            </p>
            <div className="mt-1">
              <RagSelector
                participantId={participant.id}
                status={participant.rag_status}
                note={participant.rag_note}
                suggested={suggestedRag}
              />
            </div>
          </div>
          <Badge tone={statusTone(participant.business_stage)}>
            {participant.business_stage}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <InfoCard label="Business Sector">
          {participant.business_sector || "—"}
        </InfoCard>
        <InfoCard label="Current Stage">{participant.business_stage}</InfoCard>
        <ProgressCard label="Gateway Readiness" percent={gatewayPercent} />
        <ProgressCard label="Gainful Readiness" percent={gainfulPercent} />
        <InfoCard label="Days Until Gateway">
          {daysUntilGateway === null
            ? "No target set"
            : daysUntilGateway < 0
              ? `${Math.abs(daysUntilGateway)} days overdue`
              : `${daysUntilGateway} days`}
        </InfoCard>
        <InfoCard label="Next Appointment">
          {nextAppointment
            ? new Date(nextAppointment.appointment_date).toLocaleDateString()
            : "Not scheduled"}
        </InfoCard>
        <InfoCard label="Outstanding Actions">{outstandingActionsCount}</InfoCard>
        <InfoCard label="Last Contact">
          {lastContactDate ? new Date(lastContactDate).toLocaleDateString() : "No record"}
        </InfoCard>
      </div>
    </div>
  );
}
