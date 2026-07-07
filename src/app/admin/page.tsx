import Link from "next/link";
import { listAdvisors, listOffices, getAdvisorCaseloadCounts } from "@/lib/data/advisor";
import StatCard from "@/components/stat-card";

export default async function AdminOverviewPage() {
  const [advisors, offices, caseloadCounts] = await Promise.all([
    listAdvisors(),
    listOffices(),
    getAdvisorCaseloadCounts(),
  ]);

  const activeAdvisors = advisors.filter((a) => a.status === "Active");
  const activeOffices = offices.filter((o) => o.is_active);
  const totalParticipants = [...caseloadCounts.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Administration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage offices and advisors — no code changes needed to add either.
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Link
          href="/admin/offices"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Offices</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create, rename and archive offices.
          </p>
        </Link>
        <Link
          href="/admin/advisors"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="text-sm font-semibold text-slate-900">Advisors</h2>
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
      </div>
    </div>
  );
}
