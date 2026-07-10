import Link from "next/link";
import { Children } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getAdvisorWorkQueue } from "@/lib/data/advisor-workqueue";
import { getSelfEmploymentDashboard } from "@/lib/data/self-employment";
import { getActiveAnnouncements } from "@/lib/data/announcements";
import { getUnreviewedCountForAdvisor } from "@/lib/data/notifications";
import StatCard from "@/components/stat-card";
import Badge, { statusTone } from "@/components/badge";
import TouchLastVisit from "@/components/touch-last-visit";

const EXPIRING_THRESHOLD_DAYS = 30;
const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const supabase = await createClient();

  const cookieStore = await cookies();
  const lastVisitAt = cookieStore.get(`last_visit_${advisorId}`)?.value ?? null;

  const { data: participants } = await supabase
    .from("participants")
    .select("id, ptp_name, business_name, scheme_start_date, status")
    .eq("advisor_id", advisorId)
    .order("scheme_start_date", { ascending: true });

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);

  const [
    { data: businessPlans },
    { data: actionItems },
    { data: fundingRecords },
    { data: incomeEntries },
    workQueue,
    selfEmployment,
    announcements,
    unreadNotifications,
  ] = await Promise.all([
    participantIds.length
      ? supabase
          .from("business_plans")
          .select("participant_id, status")
          .in("participant_id", participantIds)
      : Promise.resolve({ data: [] }),
    participantIds.length
      ? supabase
          .from("action_plan_items")
          .select("id, participant_id, status, description, target_date")
          .in("participant_id", participantIds)
          .neq("status", "Complete")
      : Promise.resolve({ data: [] }),
    participantIds.length
      ? supabase
          .from("funding_records")
          .select("id, participant_id, application_status, amount_requested, amount_approved, decision_date")
          .in("participant_id", participantIds)
          .order("decision_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    participantIds.length
      ? supabase.from("income_tracker_entries").select("participant_id, month").in("participant_id", participantIds)
      : Promise.resolve({ data: [] }),
    getAdvisorWorkQueue(advisorId, lastVisitAt),
    getSelfEmploymentDashboard(advisorId, advisor.full_name),
    getActiveAnnouncements(),
    getUnreviewedCountForAdvisor(advisorId),
  ]);

  const businessPlanByParticipant = new Map(
    (businessPlans ?? []).map((bp) => [bp.participant_id, bp]),
  );

  const withDaysRemaining = rows.map((p) => ({
    ...p,
    daysRemaining: getDaysRemaining(p.scheme_start_date),
  }));

  const expiring = withDaysRemaining
    .filter((p) => p.daysRemaining <= EXPIRING_THRESHOLD_DAYS)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const missingBusinessPlans = rows.filter((p) => {
    const plan = businessPlanByParticipant.get(p.id);
    return !plan || plan.status === "Not Started";
  });

  const participantInfoById = new Map(
    rows.map((p) => [p.id, { name: p.ptp_name, business: p.business_name }]),
  );
  const outstandingActions = (actionItems ?? []).map((a) => ({
    ...a,
    participantId: a.participant_id,
    participantName: participantInfoById.get(a.participant_id)?.name ?? "",
  }));

  const fundingRows = (fundingRecords ?? []).map((f) => ({
    ...f,
    participantName: participantInfoById.get(f.participant_id)?.name ?? "",
  }));
  const pendingFunding = fundingRows.filter(
    (f) => f.application_status === "Pending Manager Approval",
  );
  const recentFundingDecisions = fundingRows.filter(
    (f) => f.application_status === "Approved" || f.application_status === "Declined",
  );

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

  const participantsHref = `/advisors/${advisorId}/participants`;
  const selfEmploymentHref = `/advisors/${advisorId}/self-employment`;
  const approachingTradingStart = [
    ...selfEmployment.tsIntelligence.map((r) => ({ participantId: r.participantId, participantName: r.participantName, detail: `Eligible (NGSE) since ${r.dateEligible}` })),
    ...selfEmployment.gseClaimEligible.map((r) => ({ participantId: r.participantId, participantName: r.participantName, detail: r.detail })),
  ];

  const actionCount =
    workQueue.gatewayIncomplete.length +
    pendingFunding.length +
    workQueue.dueForContact.length +
    approachingTradingStart.length +
    unreadNotifications;

  return (
    <div className="space-y-8">
      <TouchLastVisit advisorId={advisorId} />

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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Caseload size" value={rows.length} href={participantsHref} />
        <StatCard
          label="Requiring a Gateway"
          value={workQueue.gatewayIncomplete.length}
          tone={workQueue.gatewayIncomplete.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Funding awaiting approval"
          value={pendingFunding.length}
          tone={pendingFunding.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Due for contact"
          value={workQueue.dueForContact.length}
          tone={workQueue.dueForContact.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Approaching Trading Start"
          value={approachingTradingStart.length}
        />
        <StatCard
          label="Notifications"
          value={unreadNotifications}
          href={`/advisors/${advisorId}/notifications`}
          tone={unreadNotifications > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkQueueCard title="Participants requiring a Gateway" emptyText="Everyone's Gateway is complete.">
          {workQueue.gatewayIncomplete.slice(0, 6).map((r) => (
            <Row key={r.participantId} href={`${participantsHref}/${r.participantId}?tab=gateway`} name={r.participantName}>
              <Badge tone="amber">{r.percent}% complete</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Funding" emptyText="No funding activity across your caseload.">
          {pendingFunding.slice(0, 5).map((f) => (
            <Row key={f.id} href={`${participantsHref}/${f.participant_id}?tab=funding`} name={f.participantName}>
              <Badge tone="amber">Awaiting approval</Badge>
            </Row>
          ))}
          {recentFundingDecisions.slice(0, 5).map((f) => (
            <Row key={f.id} href={`${participantsHref}/${f.participant_id}?tab=funding`} name={f.participantName}>
              <Badge tone={f.application_status === "Approved" ? "green" : "red"}>{f.application_status}</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard
          title="Income submitted since you were last here"
          emptyText="No new Income Tracker submissions since your last visit."
        >
          {workQueue.recentIncomeSubmissions.slice(0, 6).map((r, i) => (
            <Row
              key={`${r.participantId}-${i}`}
              href={`${participantsHref}/${r.participantId}?tab=income-tracker`}
              name={r.participantName}
            >
              <Badge tone="green">Net {currency.format(r.netProfit)}</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Due for contact" emptyText="Everyone's been contacted in the last 30 days.">
          {workQueue.dueForContact.slice(0, 6).map((r) => (
            <Row key={r.participantId} href={`${participantsHref}/${r.participantId}?tab=appointments`} name={r.participantName}>
              <Badge tone="amber">
                {r.daysSinceContact === null ? "Never contacted" : `${r.daysSinceContact} days ago`}
              </Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Approaching Trading Start" emptyText="No participants close to a Trading Start right now.">
          {approachingTradingStart.slice(0, 6).map((r, i) => (
            <Row key={`${r.participantId}-${i}`} href={`${participantsHref}/${r.participantId}?tab=trading-start`} name={r.participantName}>
              <Badge tone="green">Eligible</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Transferred to IWT" emptyText="No participants currently transferred to another IWT advisor.">
          {selfEmployment.transferredToIwt.slice(0, 6).map((r) => (
            <Row
              key={r.tradingStart.id}
              href={`${participantsHref}/${r.participantId}?tab=trading-start`}
              name={r.participantName}
            >
              <Badge tone="slate">{r.iwtAdvisorName}</Badge>
            </Row>
          ))}
          {selfEmployment.transferredToIwt.length > 0 && (
            <Link href={selfEmploymentHref} className="mt-3 block text-xs font-medium text-indigo-600 hover:underline">
              View full detail on the Self Employment dashboard →
            </Link>
          )}
        </WorkQueueCard>

        <WorkQueueCard title="Recently achieved Trading Starts" emptyText="No Trading Starts in the last 14 days.">
          {workQueue.recentTradingStarts.slice(0, 6).map((r) => (
            <Row key={r.participantId} href={`${participantsHref}/${r.participantId}?tab=trading-start`} name={r.participantName}>
              <Badge tone="green">{new Date(r.tradingStartDate).toLocaleDateString("en-GB")}</Badge>
            </Row>
          ))}
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

        <WorkQueueCard title="Missing business plans" emptyText="Every participant has a business plan in progress or complete.">
          {missingBusinessPlans.slice(0, 6).map((p) => (
            <Row key={p.id} href={`${participantsHref}/${p.id}?tab=business-plan`} name={p.ptp_name} subtitle={p.business_name}>
              <Badge tone="red">Not started</Badge>
            </Row>
          ))}
        </WorkQueueCard>

        <WorkQueueCard title="Outstanding actions" emptyText="No outstanding actions across your caseload." className="lg:col-span-2">
          {outstandingActions.slice(0, 8).map((a) => (
            <Row key={a.id} href={`${participantsHref}/${a.participantId}?tab=action-plan`} name={a.participantName} subtitle={a.description}>
              <Badge tone={statusTone(a.status)}>{a.status}</Badge>
            </Row>
          ))}
        </WorkQueueCard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Trading Start intelligence, Outcome progress and earnings analysis in full depth live on
          the dedicated{" "}
          <Link href={selfEmploymentHref} className="font-medium text-indigo-600 hover:underline">
            Self Employment dashboard
          </Link>
          .
        </p>
      </div>
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
