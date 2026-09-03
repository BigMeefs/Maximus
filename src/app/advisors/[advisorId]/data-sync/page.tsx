import StatCard from "@/components/stat-card";
import SyncDashboardChart from "@/components/data-sync/sync-dashboard-chart";
import { getSyncDashboardStats } from "@/lib/actions/data-sync";
import Button from "@/components/ui/button";

export default async function DataSyncPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const stats = await getSyncDashboardStats();
  const basePath = `/advisors/${advisorId}/data-sync`;

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
          <Button variant="secondary" href={`${basePath}/mapping`}>
            Field mappings
          </Button>
          <Button variant="secondary" href={`${basePath}/history`}>
            Import history
          </Button>
          <Button href={`${basePath}/import`} className="inline-flex items-center justify-center">
            + New import
          </Button>
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
