import Link from "next/link";
import Badge from "@/components/badge";
import { getImportHistory } from "@/lib/actions/data-sync";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import type { ImportStatus } from "@/types/database";

function statusTone(status: ImportStatus) {
  return status === "Success" ? "green" : status === "Partial" ? "amber" : "red";
}

export default async function ImportHistoryPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const batches = await getImportHistory();

  return (
    <div className="space-y-6">
      <PageHeader title="Import history" description="Every import run against this CRM, most recent first." />

      <Card padding="none" className="overflow-hidden">
        {batches.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No imports yet.</p>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Date</Th>
                <Th>File</Th>
                <Th className="hidden sm:table-cell">Imported by</Th>
                <Th>Rows</Th>
                <Th className="hidden lg:table-cell">Created / Updated / Errors</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(b.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/advisors/${advisorId}/data-sync/history/${b.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {b.file_name}
                    </Link>
                    <p className="text-xs text-slate-500 sm:hidden">{b.imported_by}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{b.imported_by}</td>
                  <td className="px-4 py-3 text-slate-600">{b.row_count}</td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                    {b.created_count} / {b.updated_count} / {b.error_count}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(b.status)}>{b.status}</Badge>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
