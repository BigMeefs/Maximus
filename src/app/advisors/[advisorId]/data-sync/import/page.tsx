import ImportWizard from "@/components/data-sync/import-wizard";
import { getSavedFieldMapping } from "@/lib/actions/data-sync";
import { listAdvisors } from "@/lib/data/advisor";
import PageHeader from "@/components/ui/page-header";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const [savedMapping, advisors] = await Promise.all([
    getSavedFieldMapping(),
    listAdvisors({ activeOnly: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import participants"
        description="Upload a Power BI export (.xlsx or .csv) to create or update participants. Matching participants are updated in place — funding, evidence, business progress and other CRM-only data are never overwritten."
      />
      <ImportWizard advisorId={advisorId} advisors={advisors} savedMapping={savedMapping} />
    </div>
  );
}
