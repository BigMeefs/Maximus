import ImportWizard from "@/components/data-sync/import-wizard";
import { getSavedFieldMapping } from "@/lib/actions/data-sync";
import type { AdvisorName } from "@/lib/constants";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ advisor: string }>;
}) {
  const { advisor } = (await params) as { advisor: AdvisorName };
  const savedMapping = await getSavedFieldMapping();

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
      <ImportWizard advisorName={advisor} savedMapping={savedMapping} />
    </div>
  );
}
