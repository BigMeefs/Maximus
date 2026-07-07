import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import ParticipantForm from "@/components/participant-form";
import { createParticipant } from "@/app/advisors/[advisorId]/participants/actions";

export default async function NewParticipantPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const boundAction = createParticipant.bind(null, advisorId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Add participant
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new self-employment caseload record for {advisor.full_name}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ParticipantForm
          currentAdvisorName={advisor.full_name}
          action={boundAction}
          submitLabel="Create participant"
        />
      </div>
    </div>
  );
}
