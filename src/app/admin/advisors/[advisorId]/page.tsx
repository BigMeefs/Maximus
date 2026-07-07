import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listOffices } from "@/lib/data/advisor";
import Badge from "@/components/badge";
import AdvisorEditForm from "@/components/admin/advisor-edit-form";

export default async function AdminAdvisorDetailPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const supabase = await createClient();

  const [{ data: advisor }, offices, { data: caseload }] = await Promise.all([
    supabase.from("advisors").select("*").eq("id", advisorId).maybeSingle(),
    listOffices(),
    supabase
      .from("participants")
      .select("id, ptp_name, business_name, business_stage")
      .eq("advisor_id", advisorId)
      .order("ptp_name", { ascending: true }),
  ]);

  if (!advisor) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/advisors" className="text-sm text-slate-500 hover:text-indigo-600">
          ← All advisors
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{advisor.full_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Added {new Date(advisor.created_at).toLocaleDateString("en-GB")} · Status: {advisor.status}
        </p>
      </div>

      <AdvisorEditForm advisor={advisor} offices={offices} />

      <p className="text-xs text-slate-500">
        There are no individual advisor logins in this CRM (advisors just pick their name), so
        there&apos;s no password to reset here.
      </p>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Current caseload ({caseload?.length ?? 0})
        </h2>
        {!caseload || caseload.length === 0 ? (
          <p className="text-sm text-slate-500">No participants assigned.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">PTP Name</th>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseload.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/advisors/${advisorId}/participants/${p.id}`}
                        className="font-medium text-slate-900 hover:text-indigo-600"
                      >
                        {p.ptp_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.business_name}</td>
                    <td className="px-4 py-3">
                      <Badge tone="slate">{p.business_stage}</Badge>
                    </td>
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
