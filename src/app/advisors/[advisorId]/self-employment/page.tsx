import Link from "next/link";
import clsx from "clsx";
import { Children } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getSelfEmploymentDashboard, type WorkQueueItemType } from "@/lib/data/self-employment";
import { getAdvisorWorkQueue } from "@/lib/data/advisor-workqueue";
import { getAdvisorPerformanceSummary } from "@/lib/data/performance-tracker";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import { getIncomeSubmissions } from "@/lib/data/notifications";
import StatCard from "@/components/stat-card";
import HealthBadge from "@/components/participant/health-badge";
import Badge, { statusTone } from "@/components/badge";
import PortalQrCard from "@/components/self-employment/portal-qr-card";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

const WORK_ITEM_TONE: Record<WorkQueueItemType, "red" | "amber" | "indigo" | "green"> = {
  review_overdue: "red",
  declaration_missing: "amber",
  approaching_deadline: "amber",
  outcome_ready: "green",
  eligible_for_ts: "indigo",
};

// ---------------------------------------------------------------------------
// Additional Information — everything from the old Dashboard and Self
// Employment pages that isn't required on the new main Dashboard
// (src/app/advisors/[advisorId]/dashboard/page.tsx). Nothing here was
// deleted in that consolidation; it was moved so the main Dashboard could
// focus on what needs an advisor's attention today.
// ---------------------------------------------------------------------------
export default async function AdditionalInformationPage({
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
    .select("id, ptp_name, business_name, status")
    .eq("advisor_id", advisorId);

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);
  const participantInfoById = new Map(rows.map((p) => [p.id, { name: p.ptp_name, business: p.business_name }]));

  const [
    { data: businessPlans },
    { data: actionItems },
    { data: fundingRecords },
    workQueue,
    stats,
    performanceSummary,
    settings,
    unreviewedSubmissions,
  ] = await Promise.all([
    participantIds.length
      ? supabase.from("business_plans").select("participant_id, status").in("participant_id", participantIds)
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
    getAdvisorWorkQueue(advisorId, lastVisitAt),
    getSelfEmploymentDashboard(advisorId, advisor.full_name),
    getAdvisorPerformanceSummary(advisorId),
    getProgrammeSettings(),
    getIncomeSubmissions({ advisorId, reviewed: false }),
  ]);

  const businessPlanByParticipant = new Map((businessPlans ?? []).map((bp) => [bp.participant_id, bp]));
  const missingBusinessPlans = rows.filter((p) => {
    const plan = businessPlanByParticipant.get(p.id);
    return !plan || plan.status === "Not Started";
  });

  const outstandingActions = (actionItems ?? []).map((a) => ({
    ...a,
    participantId: a.participant_id,
    participantName: participantInfoById.get(a.participant_id)?.name ?? "",
  }));

  const fundingRows = (fundingRecords ?? []).map((f) => ({
    ...f,
    participantName: participantInfoById.get(f.participant_id)?.name ?? "",
  }));
  const pendingFunding = fundingRows.filter((f) => f.application_status === "Pending Manager Approval");
  const recentFundingDecisions = fundingRows.filter(
    (f) => f.application_status === "Approved" || f.application_status === "Declined",
  );

  const participantsHref = `/advisors/${advisorId}/participants`;
  const tradingStartTabHref = (participantId: string) => `${participantsHref}/${participantId}?tab=trading-start`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Additional Information</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything else for {advisor.full_name}&apos;s caseload — Trading Starts, In Work Tracking,
          Outcomes, funding, business plans and earnings analysis. The main Dashboard covers what needs
          attention today.
        </p>
      </div>

      <PortalQrCard />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Active Participants" value={stats.activeParticipants} href={participantsHref} />
        <StatCard label="Trading Starts This Month" value={stats.tradingStartsThisMonth} />
        <StatCard label="Participants in IWT" value={stats.participantsInIwt} />
        <StatCard label="Outcomes This Month" value={stats.outcomesThisMonth} />
        <StatCard
          label="Eligible for Trading Start"
          value={stats.eligibleForTradingStart}
          tone={stats.eligibleForTradingStart > 0 ? "warning" : "default"}
        />
        <StatCard label="Near Outcome" value={stats.participantsNearOutcome} />
        <StatCard
          label="At Risk"
          value={stats.participantsAtRisk}
          tone={stats.participantsAtRisk > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Advisor Performance &amp; Forecasting</h2>
          <p className="text-xs text-slate-500">
            All-time totals attributed to {advisor.full_name} as the original advisor. Forecast Outcomes is
            computed live from current participant progress, not manually entered.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Active participants" value={stats.activeParticipants} />
          <StatCard label="Trading Starts achieved" value={stats.tradingStartsAchieved} />
          <StatCard label="Transferred to IWT" value={stats.participantsTransferredToIwt} />
          <StatCard label="Forecast Outcomes" value={stats.forecastOutcomes} />
          <StatCard label="Confirmed Outcomes" value={stats.outcomesAchieved} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
          <StatCard
            label="Participants requiring action today"
            value={stats.actionsToday}
            tone={stats.actionsToday > 0 ? "warning" : "default"}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Trading Starts this month" value={performanceSummary.tradingStartsThisMonth} />
          <StatCard label="Trading Starts this year" value={performanceSummary.tradingStartsThisYear} />
          <StatCard label="Outcomes this month" value={performanceSummary.outcomesThisMonth} />
          <StatCard label="Outcomes this year" value={performanceSummary.outcomesThisYear} />
          <StatCard label="Lifetime Trading Starts" value={performanceSummary.lifetimeTradingStarts} />
          <StatCard label="Lifetime Outcomes" value={performanceSummary.lifetimeOutcomes} />
          <StatCard label="Current conversion rate" value={`${performanceSummary.conversionRate}%`} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Pending Trading Starts"
          value={stats.pendingTradingStarts}
          tone={stats.pendingTradingStarts > 0 ? "warning" : "default"}
        />
        <StatCard label="Active Trading Starts" value={stats.activeTradingStarts} />
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

        <WorkQueueCard title="Recently achieved Trading Starts" emptyText="No Trading Starts in the last 14 days.">
          {workQueue.recentTradingStarts.slice(0, 6).map((r) => (
            <Row key={r.participantId} href={`${participantsHref}/${r.participantId}?tab=trading-start`} name={r.participantName}>
              <Badge tone="green">{new Date(r.tradingStartDate).toLocaleDateString("en-GB")}</Badge>
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

        <WorkQueueCard title="Outstanding actions" emptyText="No outstanding actions across your caseload.">
          {outstandingActions.slice(0, 8).map((a) => (
            <Row key={a.id} href={`${participantsHref}/${a.participantId}?tab=action-plan`} name={a.participantName} subtitle={a.description}>
              <Badge tone={statusTone(a.status)}>{a.status}</Badge>
            </Row>
          ))}
        </WorkQueueCard>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Income Tracker Submissions</h2>
            <p className="text-xs text-slate-500">
              New submissions from the Participant Income Tracker Portal, awaiting your review.
            </p>
          </div>
          <Link
            href={`/advisors/${advisorId}/notifications`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        {unreviewedSubmissions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No submissions awaiting review.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {unreviewedSubmissions.slice(0, 5).map((row) => (
              <li key={row.entry.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{row.participantName}</p>
                  <p className="text-xs text-slate-500">
                    {row.participantEmail} ·{" "}
                    {new Date(row.entry.entry_date).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <Badge tone="amber">
                  Net {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(row.netProfit)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Work</h2>
          <p className="text-xs text-slate-500">Everything needing action, most urgent first.</p>
        </div>
        {stats.workQueue.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            Nothing needs attention right now.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {stats.workQueue.map((item, index) => (
                <li key={`${item.type}-${item.participantId}-${index}`} className="p-3">
                  <Link
                    href={tradingStartTabHref(item.participantId)}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm hover:text-indigo-600"
                  >
                    <span>
                      <span className="font-medium text-slate-800">{item.participantName}</span>
                      <span className="ml-2 text-slate-500">{item.detail}</span>
                    </span>
                    <Badge tone={WORK_ITEM_TONE[item.type]}>{item.label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Eligible for GSE / Claim Closed Trading Start</h2>
          <p className="text-xs text-slate-500">
            Participants marked as Gainfully Self Employed or with a Claim Closed while self-employed — an
            advisor must still confirm before a Trading Start is created.
          </p>
        </div>
        {stats.gseClaimEligible.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No participants currently marked as GSE or Claim Closed.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {stats.gseClaimEligible.map((row) => (
                <li key={`${row.participantId}-${row.reason}`} className="p-3">
                  <Link
                    href={tradingStartTabHref(row.participantId)}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm hover:text-indigo-600"
                  >
                    <span>
                      <span className="font-medium text-slate-800">{row.participantName}</span>
                      <span className="ml-2 text-slate-500">{row.detail}</span>
                    </span>
                    <Badge tone="indigo">{row.reason === "GSE" ? "GSE" : "Claim Closed"}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Outcome Intelligence</h2>
          <p className="text-xs text-slate-500">
            Live progress for every participant in In Work Tracking. Reaching the target only flags
            &quot;Outcome Ready&quot; — an advisor must confirm the Outcome record.
          </p>
        </div>
        {stats.outcomeIntelligence.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No participants currently in In Work Tracking.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {stats.outcomeIntelligence.map((row) => (
              <Link
                key={row.tradingStart.id}
                href={tradingStartTabHref(row.participantId)}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{row.participantName}</p>
                  <div className="flex items-center gap-2">
                    {row.isOutcomeReady && <Badge tone="green">Outcome Ready</Badge>}
                    <HealthBadge tone={row.health.tone} label={row.health.label} />
                  </div>
                </div>

                {row.monetary && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {currency.format(row.monetary.cumulativeProfit)} of {currency.format(row.monetary.target)}
                      </span>
                      <span className="font-semibold text-slate-900">{row.monetary.percentComplete}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          row.monetary.isAchieved ? "bg-emerald-500" : "bg-indigo-500",
                        )}
                        style={{ width: `${row.monetary.percentComplete}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {currency.format(row.monetary.remaining)} remaining · {row.monetary.monthsRemaining} month(s)
                      left
                    </p>
                  </div>
                )}

                {row.gse && (
                  <p className="mt-3 text-xs text-slate-500">
                    {row.gse.monthsElapsed} of {settings.gse_outcome_period_months} months complete ·{" "}
                    {row.gse.monthsRemaining} month(s) remaining
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Transferred to IWT</h2>
          <p className="text-xs text-slate-500">
            Participants {advisor.full_name} originated whose Trading Start moved them to a different IWT
            advisor. Read-only — {advisor.full_name}&apos;s own Trading Start and Outcome statistics still
            depend on how these turn out, but only the IWT advisor (or a manager) can edit them.
          </p>
        </div>
        {stats.transferredToIwt.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No participants currently transferred to another IWT advisor.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {stats.transferredToIwt.map((row) => (
              <div
                key={row.tradingStart.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{row.participantName}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone="slate">{row.participantStatus}</Badge>
                    {row.outcome ? (
                      <Badge tone={row.outcome.outcome_achieved ? "green" : "red"}>
                        {row.outcome.outcome_achieved ? "Outcome Achieved" : "Outcome Not Achieved"}
                      </Badge>
                    ) : (
                      row.forecast && <HealthBadge tone={row.forecast.tone} label={`Forecast: ${row.forecast.label}`} />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">IWT Advisor: {row.iwtAdvisorName}</p>

                {row.monetary && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {currency.format(row.monetary.cumulativeProfit)} of {currency.format(row.monetary.target)}
                      </span>
                      <span className="font-semibold text-slate-900">{row.monetary.percentComplete}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          row.monetary.isAchieved ? "bg-emerald-500" : "bg-indigo-500",
                        )}
                        style={{ width: `${row.monetary.percentComplete}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">Outcome due {new Date(row.monetary.deadlineDate).toLocaleDateString("en-GB")}</p>
                  </div>
                )}

                {row.gse && (
                  <p className="mt-3 text-xs text-slate-500">
                    {row.gse.monthsElapsed} of {settings.gse_outcome_period_months} months complete · Outcome due{" "}
                    {new Date(row.gse.deadlineDate).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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
