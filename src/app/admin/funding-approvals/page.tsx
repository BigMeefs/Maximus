import { getFundingApprovalQueue } from "@/lib/data/funding-approvals";
import FundingApprovalQueue from "@/components/admin/funding-approval-queue";

export default async function FundingApprovalsPage() {
  const rows = await getFundingApprovalQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Funding Approval Queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Requests over £100 need a manager decision before the advisor&apos;s participant record
          updates. Requests at or below £100 approve themselves automatically and never appear
          here.
        </p>
      </div>
      <FundingApprovalQueue rows={rows} />
    </div>
  );
}
