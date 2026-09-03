import Link from "next/link";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getReferralCountsForAdvisor, listReferralsForAdvisor } from "@/lib/data/referrals";
import type { ReferralStatus } from "@/types/database";
import Badge from "@/components/badge";
import ReferralQrCard from "@/components/self-employment/referral-qr-card";
import ReferralActions from "@/components/self-employment/referral-actions";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";

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
      <PageHeader
        title="Referrals"
        description={`Potential Self Employment referrals sent to ${advisor.full_name}, plus any unassigned referrals.`}
      />

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

      <Card padding="none" className="overflow-hidden">
        {referrals.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No referrals in this view.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <Th>SE Advisor</Th>
                  <Th>Advisor</Th>
                  <Th>Participant ENG</Th>
                  <Th>Business Idea</Th>
                  <Th>Date of Submission</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </THead>
              <TBody>
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {r.advisor_name ?? <Badge tone="slate">No preference</Badge>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.referring_advisor_name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {r.status === "accepted" && r.accepted_participant_id ? (
                        <Link
                          href={`/advisors/${advisorId}/participants/${r.accepted_participant_id}`}
                          className="hover:text-indigo-600"
                        >
                          {r.participant_eng}
                        </Link>
                      ) : (
                        r.participant_eng
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">{r.business_idea}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.submitted_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "new" && (
                        <ReferralActions
                          referralId={r.id}
                          advisorId={advisorId}
                          participantName={r.participant_name ?? r.participant_eng}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
