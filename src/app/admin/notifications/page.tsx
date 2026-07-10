import { listAdvisors, listOffices } from "@/lib/data/advisor";
import { getNotificationHistory } from "@/lib/data/notifications";
import type { NotificationStatus, NotificationType } from "@/types/database";
import NotificationHistoryFilters from "@/components/admin/notification-history-filters";
import NotificationHistoryList from "@/components/admin/notification-history-list";

export default async function NotificationHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    office?: string;
    advisor?: string;
    participant?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    search?: string;
  }>;
}) {
  const { office, advisor, participant, type, status, from, to, search } = await searchParams;

  const [rows, advisors, offices] = await Promise.all([
    getNotificationHistory({
      officeId: office || undefined,
      advisorId: advisor || undefined,
      participantName: participant || undefined,
      type: (type as NotificationType) || undefined,
      status: (status as NotificationStatus) || undefined,
      from: from || undefined,
      to: to || undefined,
      search: search || undefined,
    }),
    listAdvisors(),
    listOffices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notification History</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every notification ever created, across every advisor — the audit trail behind each advisor&apos;s
          live Notifications panel. Showing the most recent 300 matching rows.
        </p>
      </div>

      <NotificationHistoryFilters offices={offices} advisors={advisors} />

      <NotificationHistoryList rows={rows} />
    </div>
  );
}
