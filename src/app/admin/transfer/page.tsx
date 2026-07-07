import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { getRecentTransfers } from "@/lib/actions/transfer";
import TransferTool from "@/components/admin/transfer-tool";

export default async function AdminTransferPage() {
  const supabase = await createClient();

  const [{ data: participants }, activeAdvisors, allAdvisors, transfers] = await Promise.all([
    supabase
      .from("participants")
      .select("id, ptp_name, business_name, advisor_id")
      .order("ptp_name", { ascending: true }),
    listAdvisors({ activeOnly: true }),
    listAdvisors(),
    getRecentTransfers(),
  ]);

  const advisorNameById = new Map(allAdvisors.map((a) => [a.id, a.full_name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Transfer participants</h1>
        <p className="mt-1 text-sm text-slate-500">
          Move one or many participants to a different advisor. Their office updates
          automatically, and every other record — notes, documents, funding, AI summaries,
          Gateway progress — stays exactly as it is.
        </p>
      </div>

      <TransferTool participants={participants ?? []} advisors={activeAdvisors} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Recent transfers</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-slate-500">No transfers recorded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(t.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.from_advisor_id ? advisorNameById.get(t.from_advisor_id) ?? "Unknown" : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {advisorNameById.get(t.to_advisor_id) ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{t.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
