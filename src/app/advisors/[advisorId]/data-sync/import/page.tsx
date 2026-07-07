import ImportWizard from "@/components/data-sync/import-wizard";
import { getSavedFieldMapping } from "@/lib/actions/data-sync";
import { listAdvisors } from "@/lib/data/advisor";

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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import participants</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a Power BI export (.xlsx or .csv) to create or update participants. Matching
          participants are updated in place — funding, evidence, business progress and other CRM-only
          data are never overwritten.
        </p>
      </div>
      <ImportWizard advisorId={advisorId} advisors={advisors} savedMapping={savedMapping} />
    </div>
  );
}
