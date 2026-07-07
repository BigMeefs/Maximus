import { getCurrentAdvisor } from "@/lib/current-advisor";
import ParticipantForm from "@/components/participant-form";
import { createParticipant } from "@/app/(app)/participants/actions";

export default async function NewParticipantPage() {
  const advisor = await getCurrentAdvisor();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Add participant
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new self-employment caseload record.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ParticipantForm
          currentAdvisorName={advisor.name}
          action={createParticipant}
          submitLabel="Create participant"
        />
      </div>
    </div>
  );
}
