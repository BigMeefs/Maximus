import Link from "next/link";
import { listAdvisors, listOffices, getAdvisorCaseloadCounts } from "@/lib/data/advisor";
import { getFundingApprovalQueue } from "@/lib/data/funding-approvals";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";

export default async function AdminOverviewPage() {
  const [advisors, offices, caseloadCounts, fundingQueue] = await Promise.all([
    listAdvisors(),
    listOffices(),
    getAdvisorCaseloadCounts(),
    getFundingApprovalQueue(),
  ]);

  const activeAdvisors = advisors.filter((a) => a.status === "Active");
  const activeOffices = offices.filter((o) => o.is_active);
  const totalParticipants = [...caseloadCounts.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage offices, advisors, funding approvals and programme thresholds — no code changes
          needed to add either.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Offices" value={activeOffices.length} href="/admin/offices" />
        <StatCard label="Advisors" value={activeAdvisors.length} href="/admin/advisors" />
        <StatCard label="Total participants" value={totalParticipants} />
        <StatCard
          label="Inactive advisors"
          value={advisors.length - activeAdvisors.length}
          href="/admin/advisors"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/offices"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Office Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create, rename and archive offices.
          </p>
        </Link>
        <Link
          href="/admin/advisors"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">User Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add advisors, edit their details, move them between offices, and view caseloads.
          </p>
        </Link>
        <Link
          href="/admin/transfer"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Transfer participants</h2>
          <p className="mt-1 text-sm text-slate-500">
            Redistribute one or many participants to a different advisor.
          </p>
        </Link>
        <Link
          href="/admin/funding-approvals"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Funding Approval Queue</h2>
            {fundingQueue.length > 0 && <Badge tone="amber">{fundingQueue.length} pending</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Approve or reject funding requests over £100.
          </p>
        </Link>
        <Link
          href="/admin/programme-settings"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Threshold Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure the Trading Start / Outcome thresholds the eligibility rules use.
          </p>
        </Link>
        <Link
          href="/admin/announcements"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Announcements</h2>
          <p className="mt-1 text-sm text-slate-500">
            Post short notices that appear on every advisor&apos;s dashboard.
          </p>
        </Link>
        <Link
          href="/admin/organisation-settings"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Organisation Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Rebrand the app: organisation/application name, logo, and brand colours.
          </p>
        </Link>
        <Link
          href="/admin/notifications"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Notification History</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search, filter, restore or permanently delete every notification ever sent, across every
            advisor.
          </p>
        </Link>
      </div>
    </div>
  );
}
