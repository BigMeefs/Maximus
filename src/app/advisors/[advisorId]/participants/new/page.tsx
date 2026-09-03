import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import ParticipantForm from "@/components/participant-form";
import { createParticipant } from "@/app/advisors/[advisorId]/participants/actions";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";

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
      <PageHeader
        title="Add participant"
        description={`Create a new self-employment caseload record for ${advisor.full_name}.`}
      />

      <Card padding="lg">
        <ParticipantForm
          currentAdvisorName={advisor.full_name}
          action={boundAction}
          submitLabel="Create participant"
        />
      </Card>
    </div>
  );
}
