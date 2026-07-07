import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ParticipantForm from "@/components/participant-form";
import { updateParticipant } from "@/app/advisors/[advisorId]/participants/actions";

export default async function EditParticipantPage({
  params,
}: {
  params: Promise<{ advisorId: string; id: string }>;
}) {
  const { advisorId, id } = await params;
  const supabase = await createClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (!participant) {
    notFound();
  }

  const { data: assignedAdvisor } = await supabase
    .from("advisors")
    .select("full_name")
    .eq("id", participant.advisor_id)
    .maybeSingle();

  const boundAction = updateParticipant.bind(null, advisorId, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Edit participant
        </h1>
        <p className="mt-1 text-sm text-slate-500">{participant.ptp_name}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ParticipantForm
          currentAdvisorName={assignedAdvisor?.full_name ?? "Unknown advisor"}
          participant={participant}
          action={boundAction}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
