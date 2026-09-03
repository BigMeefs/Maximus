import { notFound } from "next/navigation";
import Badge from "@/components/badge";
import DownloadErrorsButton from "@/components/data-sync/download-errors-button";
import { getImportBatch, getImportBatchErrors } from "@/lib/actions/data-sync";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import type { ImportStatus } from "@/types/database";

function statusTone(status: ImportStatus) {
  return status === "Success" ? "green" : status === "Partial" ? "amber" : "red";
}

export default async function ImportBatchDetailPage({
  params,
}: {
  params: Promise<{ advisorId: string; batchId: string }>;
}) {
  const { batchId } = await params;
  const batch = await getImportBatch(batchId);
  if (!batch) notFound();

  const errors = await getImportBatchErrors(batchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.file_name}
        description={`Imported by ${batch.imported_by} on ${new Date(batch.created_at).toLocaleString("en-GB")}`}
      />

      <div className="flex items-center gap-3">
        <Badge tone={statusTone(batch.status)}>{batch.status}</Badge>
        {batch.notes && <span className="text-sm text-slate-600">{batch.notes}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Rows" value={batch.row_count} />
        <Stat label="Created" value={batch.created_count} />
        <Stat label="Updated" value={batch.updated_count} />
        <Stat label="Duplicates" value={batch.duplicate_count} />
        <Stat label="Errors" value={batch.error_count} />
        <Stat label="Skipped" value={batch.skipped_count} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Row errors</h2>
          <DownloadErrorsButton errors={errors} fileName={batch.file_name} />
        </div>

        {errors.length === 0 ? (
          <p className="text-sm text-slate-500">No row errors on this import.</p>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <Th>Row</Th>
                  <Th>Error</Th>
                </tr>
              </THead>
              <TBody>
                {errors.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-slate-500">{e.row_number}</td>
                    <td className="px-4 py-3 text-slate-700">{e.error_message}</td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
