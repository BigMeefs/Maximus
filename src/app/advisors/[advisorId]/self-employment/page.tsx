import Link from "next/link";
import clsx from "clsx";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getSelfEmploymentDashboard, type WorkQueueItemType } from "@/lib/data/self-employment";
import { getProgrammeSettings } from "@/lib/data/programme-settings";
import { getIncomeSubmissions } from "@/lib/data/notifications";
import StatCard from "@/components/stat-card";
import HealthBadge from "@/components/participant/health-badge";
import Badge from "@/components/badge";
import PortalQrCard from "@/components/self-employment/portal-qr-card";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

const WORK_ITEM_TONE: Record<WorkQueueItemType, "red" | "amber" | "indigo" | "green"> = {
  review_overdue: "red",
  declaration_missing: "amber",
  approaching_deadline: "amber",
  outcome_ready: "green",
  eligible_for_ts: "indigo",
};

export default async function SelfEmploymentDashboardPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const [stats, settings, unreviewedSubmissions] = await Promise.all([
    getSelfEmploymentDashboard(advisorId, advisor.full_name),
    getProgrammeSettings(),
    getIncomeSubmissions({ advisorId, reviewed: false }),
  ]);

  const participantsHref = `/advisors/${advisorId}/participants`;
  const tradingStartTabHref = (participantId: string) => `${participantsHref}/${participantId}?tab=trading-start`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Self Employment Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trading Starts, In Work Tracking, Outcomes and earnings analysis for {advisor.full_name}&apos;s
          caseload.
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
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label="Pending Trading Starts"
          value={stats.pendingTradingStarts}
          tone={stats.pendingTradingStarts > 0 ? "warning" : "default"}
        />
        <StatCard label="Active Trading Starts" value={stats.activeTradingStarts} />
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
          <h2 className="text-sm font-semibold text-slate-900">Eligible for NGSE Trading Start</h2>
          <p className="text-xs text-slate-500">
            Detected automatically when the average net profit across any two consecutive Income Tracker
            months reaches £{settings.ngse_average_threshold.toLocaleString("en-GB")} (configurable in
            Programme Settings) — a Trading Start is never created automatically, an advisor must confirm.
          </p>
        </div>
        {stats.tsIntelligence.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No participants currently meet the NGSE Trading Start threshold.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Advisor</th>
                  <th className="px-4 py-3">Month 1 Net Profit</th>
                  <th className="px-4 py-3">Month 2 Net Profit</th>
                  <th className="px-4 py-3">Date Eligible</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.tsIntelligence.map((row) => (
                  <tr key={row.participantId}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.participantName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.advisorName}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(row.month1NetProfit)}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(row.month2NetProfit)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.dateEligible ? new Date(row.dateEligible).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={tradingStartTabHref(row.participantId)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                      >
                        Create Trading Start
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
