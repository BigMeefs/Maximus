import Link from "next/link";
import StatCard from "@/components/stat-card";
import SyncDashboardChart from "@/components/data-sync/sync-dashboard-chart";
import { getSyncDashboardStats } from "@/lib/actions/data-sync";
import type { AdvisorName } from "@/lib/constants";

export default async function DataSyncPage({
  params,
}: {
  params: Promise<{ advisor: string }>;
}) {
  const { advisor } = (await params) as { advisor: AdvisorName };
  const stats = await getSyncDashboardStats();
  const basePath = `/advisors/${advisor}/data-sync`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Data Sync</h1>
          <p className="mt-1 text-sm text-slate-500">
            Import participant data from Power BI exports and keep track of every import that&apos;s run.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`${basePath}/mapping`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Field mappings
          </Link>
          <Link
            href={`${basePath}/history`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import history
          </Link>
          <Link
            href={`${basePath}/import`}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + New import
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Last import"
          value={stats.lastImportDate ? new Date(stats.lastImportDate).toLocaleDateString("en-GB") : "Never"}
        />
        <StatCard label="Total imported" value={stats.totalParticipantsImported} />
        <StatCard label="New participants" value={stats.newParticipantsAdded} />
        <StatCard label="Participants updated" value={stats.participantsUpdated} />
        <StatCard
          label="Import errors"
          value={stats.importErrors}
          tone={stats.importErrors > 0 ? "danger" : "default"}
        />
        <StatCard label="Imports this month" value={stats.importsThisMonth} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent import activity</h2>
        <SyncDashboardChart batches={stats.recentBatches} />
      </div>
    </div>
  );
}
