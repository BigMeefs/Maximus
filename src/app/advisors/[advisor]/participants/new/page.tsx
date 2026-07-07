import type { AdvisorName } from "@/lib/constants";
import ParticipantForm from "@/components/participant-form";
import { createParticipant } from "@/app/advisors/[advisor]/participants/actions";

export default async function NewParticipantPage({
  params,
}: {
  params: Promise<{ advisor: string }>;
}) {
  const { advisor } = (await params) as { advisor: AdvisorName };
  const boundAction = createParticipant.bind(null, advisor);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Add participant
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new self-employment caseload record for {advisor}.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ParticipantForm
          currentAdvisorName={advisor}
          action={boundAction}
          submitLabel="Create participant"
        />
      </div>
    </div>
  );
}
