import Link from "next/link";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getReferralCountsForAdvisor, listReferralsForAdvisor } from "@/lib/data/referrals";
import type { ReferralStatus } from "@/types/database";
import Badge from "@/components/badge";
import ReferralQrCard from "@/components/self-employment/referral-qr-card";
import ReferralActions from "@/components/self-employment/referral-actions";

const STATUS_TABS: { value: ReferralStatus | "all"; label: string }[] = [
  { value: "new", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function statusTone(status: ReferralStatus) {
  return status === "new" ? "amber" : status === "accepted" ? "green" : "slate";
}

export default async function ReferralsPage({
  params,
  searchParams,
}: {
  params: Promise<{ advisorId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { advisorId } = await params;
  const { status: statusParam } = await searchParams;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const status = STATUS_TABS.some((t) => t.value === statusParam) ? (statusParam as ReferralStatus | "all") : "new";

  const [counts, referrals] = await Promise.all([
    getReferralCountsForAdvisor(advisorId),
    listReferralsForAdvisor(advisorId, status === "all" ? undefined : status),
  ]);

  const basePath = `/advisors/${advisorId}/referrals`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Referrals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Potential Self Employment referrals sent to {advisor.full_name}, plus any unassigned
          referrals.
        </p>
      </div>

      <ReferralQrCard />

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "new" ? basePath : `${basePath}?status=${tab.value}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && ` (${counts[tab.value]})`}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {referrals.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No referrals in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Advisor Name</th>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Participant ENG</th>
                  <th className="px-4 py-3">Business Idea</th>
                  <th className="px-4 py-3">Date of Submission</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((r) => {
                  const displayName = r.participant_name ?? r.participant_eng;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        {r.advisor_name ?? <Badge tone="slate">Unassigned</Badge>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {r.status === "accepted" && r.accepted_participant_id ? (
                          <Link
                            href={`/advisors/${advisorId}/participants/${r.accepted_participant_id}`}
                            className="hover:text-indigo-600"
                          >
                            {displayName}
                          </Link>
                        ) : (
                          displayName
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.participant_eng}</td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">{r.business_idea}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.submitted_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.status === "new" && (
                          <ReferralActions referralId={r.id} advisorId={advisorId} participantName={displayName} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
