import Link from "next/link";
import Badge from "@/components/badge";
import { getImportHistory } from "@/lib/actions/data-sync";
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import history</h1>
        <p className="mt-1 text-sm text-slate-500">Every import run against this CRM, most recent first.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {batches.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No imports yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">File</th>
                <th className="hidden px-4 py-3 sm:table-cell">Imported by</th>
                <th className="px-4 py-3">Rows</th>
                <th className="hidden px-4 py-3 lg:table-cell">Created / Updated / Errors</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
