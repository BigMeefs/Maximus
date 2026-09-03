import Link from "next/link";
import { Children } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getSelfEmploymentDashboard } from "@/lib/data/self-employment";
import { getActiveAnnouncements } from "@/lib/data/announcements";
import { getActiveNotificationCount, getActiveNotificationsForAdvisor } from "@/lib/data/notifications";
import { syncAutoNotificationsForAdvisor } from "@/lib/data/notification-rules";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import TouchLastVisit from "@/components/touch-last-visit";
import Button from "@/components/ui/button";
import { Table, THead, Th, TBody } from "@/components/ui/table";

const EXPIRING_THRESHOLD_DAYS = 30;
const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

// ---------------------------------------------------------------------------
// The main Advisor Dashboard — a daily command centre, not a full analytics
// view. It's the merge of what used to be two separate pages (Dashboard +
// Self Employment dashboard, see the nav): this page keeps only what needs
// an advisor's attention today or a quick caseload overview; everything
// else that used to live on either page (funding, outstanding actions,
// missing business plans list, GSE/Claim Closed eligibility, Outcome
// Intelligence, Transferred to IWT, full performance/forecasting, the
// Income Tracker Portal link) moved to "Additional Information"
// (src/app/advisors/[advisorId]/self-employment/page.tsx) — nothing was
// deleted, only relocated.
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const supabase = await createClient();

  // The Dashboard is one of the two places (with the Notifications page
  // itself) that refreshes the computed-condition notifications before
  // reading them — see src/lib/data/notification-rules.ts.
  await syncAutoNotificationsForAdvisor(advisorId);

  const { data: participants } = await supabase
    .from("participants")
    .select(
      "id, ptp_name, business_name, scheme_start_date, status, rag_status, gateway_booked_status, gateway_appointment_date",
    )
    .eq("advisor_id", advisorId)
    .order("scheme_start_date", { ascending: true });

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);

  const [{ data: businessPlans }, { data: incomeEntries }, selfEmployment, announcements, unreadNotifications, activeNotifications, settings] =
    await Promise.all([
      participantIds.length
        ? supabase.from("business_plans").select("participant_id, status, file_path").in("participant_id", participantIds)
        : Promise.resolve({ data: [] }),
      participantIds.length
        ? supabase.from("income_tracker_entries").select("participant_id, month").in("participant_id", participantIds)
        : Promise.resolve({ data: [] }),
      getSelfEmploymentDashboard(advisorId, advisor.full_name),
      getActiveAnnouncements(),
      getActiveNotificationCount(advisorId),
      getActiveNotificationsForAdvisor(advisorId),
      getProgrammeSettings(),
    ]);

  const withDaysRemaining = rows.map((p) => ({
    ...p,
    daysRemaining: getDaysRemaining(p.scheme_start_date),
  }));

  const expiring = withDaysRemaining
    .filter((p) => p.daysRemaining <= EXPIRING_THRESHOLD_DAYS)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const latestIncomeMonthByParticipant = new Map<string, string>();
  for (const e of incomeEntries ?? []) {
    const existing = latestIncomeMonthByParticipant.get(e.participant_id);
    if (!existing || e.month > existing) latestIncomeMonthByParticipant.set(e.participant_id, e.month);
  }
  const incomeTrackerAlerts = rows.filter(
    (p) =>
      p.status === "Active" &&
      latestIncomeMonthByParticipant.get(p.id)?.slice(0, 7) !== currentMonthKey,
  );

  // ---- Gateways Coming Up: participants with a booked Gateway appointment,
  // soonest first — existing gateway_booked_status / gateway_appointment_date
  // fields, not a new calculation. ----
  const gatewaysComingUp = rows
    .filter((p) => p.gateway_booked_status === "Booked" && p.gateway_appointment_date)
    .sort((a, b) => (a.gateway_appointment_date ?? "").localeCompare(b.gateway_appointment_date ?? ""));

  // ---- Compact stats section ----
  const ragCounts = {
    Green: rows.filter((p) => p.rag_status === "Green").length,
    Amber: rows.filter((p) => p.rag_status === "Amber").length,
    Red: rows.filter((p) => p.rag_status === "Red").length,
  };
  const businessPlansUploaded = (businessPlans ?? []).filter((bp) => bp.file_path).length;

  const participantsHref = `/advisors/${advisorId}/participants`;
  const additionalInfoHref = `/advisors/${advisorId}/self-employment`;
  const tradingStartTabHref = (participantId: string) => `${participantsHref}/${participantId}?tab=trading-start`;

  const actionCount =
    incomeTrackerAlerts.length +
    expiring.length +
    selfEmployment.tsIntelligence.length +
    gatewaysComingUp.length +
    unreadNotifications;

  return (
    <div className="space-y-8">
      <TouchLastVisit advisorId={advisorId} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back, {advisor.full_name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {actionCount > 0
              ? `${actionCount} item${actionCount === 1 ? "" : "s"} need your attention today.`
              : "Nothing needs your attention right now — nice and quiet."}
          </p>
        </div>
        <Button variant="secondary" href={additionalInfoHref} className="shrink-0">
          Additional Information →
        </Button>
      </div>

      {announcements.length > 0 && (
        <section className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-sm font-semibold text-indigo-900">{a.title}</p>
              <p className="mt-0.5 text-sm text-indigo-800">{a.body}</p>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Caseload size" value={rows.length} href={participantsHref} />
        <StatCard
          label="Notifications"
          value={unreadNotifications}
          href={`/advisors/${advisorId}/notifications`}
          tone={unreadNotifications > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Eligible for NGSE Trading Start"
          value={selfEmployment.tsIntelligence.length}
          tone={selfEmployment.tsIntelligence.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkQueueCard title="Notifications" emptyText="You're all caught up. No notifications require your attention." className="lg:col-span-2">
          {activeNotifications.slice(0, 6).map((n) => (
            <Row
              key={n.id}
              href={n.participant_id ? `${participantsHref}/${n.participant_id}` : `/advisors/${advisorId}/notifications`}
              name={n.title}
            >
              <Badge tone={n.status === "Action Required" ? "amber" : "indigo"}>{n.status}</Badge>
            </Row>
          ))}
          {activeNotifications.length > 0 && (
            <Link href={`/advisors/${advisorId}/notifications`} className="mt-3 block text-xs font-medium text-indigo-600 hover:underline">
              View all {activeNotifications.length} in Notifications →
            </Link>
          )}
        </WorkQueueCard>

        <WorkQueueCard title="Income Tracker alerts" emptyText={`Every active participant has logged income for ${currentMonthKey}.`}>
          {incomeTrackerAlerts.slice(0, 6).map((p) => (
            <Row key={p.id} href={`${participantsHref}/${p.id}?tab=income-tracker`} name={p.ptp_name} subtitle={p.business_name}>
              <Badge tone="amber">No entry this month</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Expiring participants" emptyText={`No participants expiring within ${EXPIRING_THRESHOLD_DAYS} days.`}>
          {expiring.slice(0, 6).map((p) => (
            <Row key={p.id} href={`${participantsHref}/${p.id}`} name={p.ptp_name} subtitle={p.business_name}>
              <Badge tone={p.daysRemaining <= 0 ? "red" : "amber"}>
                {p.daysRemaining <= 0 ? "Expired" : `${p.daysRemaining} days left`}
              </Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Gateways coming up" emptyText="No Gateway appointments currently booked.">
          {gatewaysComingUp.slice(0, 6).map((p) => (
            <Row key={p.id} href={`${participantsHref}/${p.id}?tab=gateway`} name={p.ptp_name} subtitle={p.business_name}>
              <Badge tone="indigo">
                {p.gateway_appointment_date ? new Date(p.gateway_appointment_date).toLocaleDateString("en-GB") : "—"}
              </Badge>
            </Row>
          ))}
        </WorkQueueCard>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Eligible for NGSE Trading Start</h2>
          <p className="text-xs text-slate-500">
            Detected automatically once any two Income Tracker months (not necessarily consecutive)
            average £{settings.ngse_average_threshold.toLocaleString("en-GB")} net profit or more between
            them (configurable in Programme Settings) — a Trading Start is never created automatically,
            an advisor must confirm.
          </p>
        </div>
        {selfEmployment.tsIntelligence.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No participants currently meet the NGSE Trading Start threshold.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <tr>
                    <Th>Participant</Th>
                    <Th>Month 1 Net Profit</Th>
                    <Th>Month 2 Net Profit</Th>
                    <Th>Date Eligible</Th>
                    <Th />
                  </tr>
                </THead>
                <TBody>
                  {selfEmployment.tsIntelligence.map((row) => (
                    <tr key={row.participantId}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.participantName}</td>
                      <td className="px-4 py-3 text-slate-600">{currency.format(row.month1NetProfit)}</td>
                      <td className="px-4 py-3 text-slate-600">{currency.format(row.month2NetProfit)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.dateEligible ? new Date(row.dateEligible).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button href={tradingStartTabHref(row.participantId)} size="xs">
                          Create Trading Start
                        </Button>
                      </td>
                    </tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        )}
      </section>

      {/* ---- Compact Stats section ---- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Stats</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">RAG breakdown</p>
            <div className="mt-3 flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <Badge tone="green">{ragCounts.Green}</Badge> Green
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <Badge tone="amber">{ragCounts.Amber}</Badge> Amber
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-700">
                <Badge tone="red">{ragCounts.Red}</Badge> Red
              </span>
            </div>
          </div>

          <StatCard label="Business plans uploaded" value={businessPlansUploaded} />

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Trading Starts — rolling 3 months</p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              {selfEmployment.tradingStartsRolling3Months.map((m) => (
                <div key={m.month} className="flex items-center justify-between">
                  <span>{m.month}</span>
                  <span className="font-semibold text-slate-900">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkQueueCard({
  title,
  emptyText,
  className,
  children,
}: {
  title: string;
  emptyText: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hasChildren = Children.toArray(children).length > 0;
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className ?? ""}`}>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {hasChildren ? <ul className="divide-y divide-slate-100">{children}</ul> : <p className="text-sm text-slate-500">{emptyText}</p>}
    </section>
  );
}

function Row({
  href,
  name,
  subtitle,
  children,
}: {
  href: string;
  name: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="py-2.5">
      <Link href={href} className="flex items-center justify-between gap-3 text-sm hover:text-indigo-600">
        <span className="font-medium text-slate-800">
          {name}
          {subtitle && <span className="ml-1 font-normal text-slate-500">· {subtitle}</span>}
        </span>
        {children}
      </Link>
    </li>
  );
}
