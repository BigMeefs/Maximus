import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getActiveNotificationsForAdvisor } from "@/lib/data/notifications";
import { syncAutoNotificationsForAdvisor } from "@/lib/data/notification-rules";
import { createClient } from "@/lib/supabase/server";
import NotificationQueue, { type NotificationRow } from "@/components/notifications/notification-queue";
import PageHeader from "@/components/ui/page-header";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const currentAdvisor = await getAdvisorOrNotFound(advisorId);

  // Refreshes the computed-condition notifications (Trading Start
  // eligibility, contact required, upcoming reviews) before reading —
  // event-driven ones (income, funding, transfers, outcomes) are already
  // up to date since they're created the instant the underlying action
  // happens. See src/lib/data/notification-rules.ts.
  await syncAutoNotificationsForAdvisor(advisorId);
  const notifications = await getActiveNotificationsForAdvisor(advisorId);

  const participantIds = [...new Set(notifications.map((n) => n.participant_id).filter((id): id is string => !!id))];
  const supabase = await createClient();
  const { data: participants } = participantIds.length
    ? await supabase.from("participants").select("id, ptp_name").in("id", participantIds)
    : { data: [] };
  const participantNameById = new Map((participants ?? []).map((p) => [p.id, p.ptp_name]));

  const rows: NotificationRow[] = notifications.map((n) => ({
    ...n,
    participantName: n.participant_id ? (participantNameById.get(n.participant_id) ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Your live work queue — everything below needs a look. Marking something reviewed removes it from this list immediately; it isn't deleted, just moved to the audit trail (Admin Dashboard → Notification History)."
      />

      <NotificationQueue notifications={rows} advisorId={advisorId} reviewedByName={currentAdvisor.full_name} />
    </div>
  );
}
