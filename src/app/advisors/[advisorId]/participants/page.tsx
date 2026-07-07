import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import Badge, { statusTone } from "@/components/badge";
import ParticipantFilters from "@/components/participant-filters";
import type { RagStatus } from "@/types/database";

function ragTone(status: RagStatus) {
  return status === "Green" ? "green" : status === "Amber" ? "amber" : "red";
}

export default async function ParticipantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ advisorId: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { advisorId } = await params;
  const { q = "", filter = "all" } = await searchParams;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const basePath = `/advisors/${advisorId}/participants`;
  const supabase = await createClient();

  const { data: participants } = await supabase
    .from("participants")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });

  const participantIds = (participants ?? []).map((p) => p.id);
  const { data: businessPlans } = participantIds.length
    ? await supabase
        .from("business_plans")
        .select("participant_id, status")
        .in("participant_id", participantIds)
    : { data: [] };

  const businessPlanByParticipant = new Map(
    (businessPlans ?? []).map((bp) => [bp.participant_id, bp.status]),
  );

  let rows = (participants ?? []).map((p) => ({
    ...p,
    daysRemaining: getDaysRemaining(p.scheme_start_date),
    businessPlanStatus: businessPlanByParticipant.get(p.id) ?? "Not Started",
  }));

  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    rows = rows.filter(
      (p) =>
        p.ptp_name.toLowerCase().includes(needle) ||
        p.business_name.toLowerCase().includes(needle),
    );
  }

  if (filter === "expiring") {
    rows = rows.filter((p) => p.daysRemaining <= 30);
  } else if (filter === "missing-plan") {
    rows = rows.filter((p) => p.businessPlanStatus === "Not Started");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {advisor.full_name}&apos;s Participants
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} of {participants?.length ?? 0} participants
          </p>
        </div>
        <Link
          href={`${basePath}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          + Add participant
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ParticipantFilters
          basePath={basePath}
          defaultQuery={q}
          defaultFilter={filter}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No participants match your search.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">PTP Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Business</th>
                <th className="px-4 py-3">RAG</th>
                <th className="hidden px-4 py-3 md:table-cell">Stage</th>
                <th className="px-4 py-3">Days remaining</th>
                <th className="hidden px-4 py-3 lg:table-cell">
                  Business plan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${p.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {p.ptp_name}
                    </Link>
                    <p className="text-xs text-slate-500 sm:hidden">
                      {p.business_name}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {p.business_name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={ragTone(p.rag_status)}>{p.rag_status}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {p.business_stage}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={p.daysRemaining <= 30 ? (p.daysRemaining <= 0 ? "red" : "amber") : "slate"}>
                      {p.daysRemaining <= 0
                        ? "Expired"
                        : `${p.daysRemaining} days`}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <Badge tone={statusTone(p.businessPlanStatus)}>
                      {p.businessPlanStatus}
                    </Badge>
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
