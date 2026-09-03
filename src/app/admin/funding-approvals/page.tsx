import { getFundingApprovalQueue } from "@/lib/data/funding-approvals";
import FundingApprovalQueue from "@/components/admin/funding-approval-queue";
import PageHeader from "@/components/ui/page-header";

export default async function FundingApprovalsPage() {
  const rows = await getFundingApprovalQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funding Approval Queue"
        description="Requests over £100 need a manager decision before the advisor's participant record updates. Requests at or below £100 approve themselves automatically and never appear here."
      />
      <FundingApprovalQueue rows={rows} />
    </div>
  );
}
