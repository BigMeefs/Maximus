import { getAdvisorOrNotFound, listAdvisors, listOffices } from "@/lib/data/advisor";
import { getIncomeSubmissions } from "@/lib/data/notifications";
import NotificationFilters from "@/components/notifications/notification-filters";
import SubmissionList from "@/components/notifications/submission-list";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ advisorId: string }>;
  searchParams: Promise<{ advisor?: string; office?: string; from?: string; to?: string; status?: string }>;
}) {
  const { advisorId } = await params;
  const { advisor: advisorFilter, office, from, to, status } = await searchParams;
  const currentAdvisor = await getAdvisorOrNotFound(advisorId);

  const reviewed = status === "reviewed" ? true : status === "unreviewed" ? false : undefined;

  const [rows, advisors, offices] = await Promise.all([
    getIncomeSubmissions({
      advisorId: advisorFilter || undefined,
      officeId: office || undefined,
      from: from || undefined,
      to: to || undefined,
      reviewed,
    }),
    listAdvisors(),
    listOffices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Income Tracker Submissions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submissions from the Participant Income Tracker Portal, newest first.
        </p>
      </div>

      <NotificationFilters offices={offices} advisors={advisors} />

      <SubmissionList rows={rows} reviewedByName={currentAdvisor.full_name} />
    </div>
  );
}
