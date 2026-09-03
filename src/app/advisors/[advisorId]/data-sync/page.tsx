import StatCard from "@/components/stat-card";
import SyncDashboardChart from "@/components/data-sync/sync-dashboard-chart";
import { getSyncDashboardStats } from "@/lib/actions/data-sync";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";

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
      <PageHeader
        title="Data Sync"
        description="Import participant data from Power BI exports and keep track of every import that's run."
        actions={
          <>
            <Button variant="secondary" href={`${basePath}/mapping`}>
              Field mappings
            </Button>
            <Button variant="secondary" href={`${basePath}/history`}>
              Import history
            </Button>
            <Button href={`${basePath}/import`} className="inline-flex items-center justify-center">
              + New import
            </Button>
          </>
        }
      />

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

      <Card padding="lg">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent import activity</h2>
        <SyncDashboardChart batches={stats.recentBatches} />
      </Card>
    </div>
  );
}
