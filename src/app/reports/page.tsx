import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import MonthlyProgressChart from "@/components/reports/monthly-progress-chart";
import { getCompanyReportStats, getTradingStartReportStats } from "@/lib/data/reports";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

const REASON_LABEL: Record<string, string> = {
  GSE: "GSE",
  NGSE: "NGSE",
  "Claim Closed Whilst Self Employed": "Claim Closed",
};

function ragTone(label: string) {
  return label === "Green" ? "green" : label === "Amber" ? "amber" : "red";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const dateRange = from || to ? { from, to } : undefined;

  const [stats, tsStats] = await Promise.all([
    getCompanyReportStats(),
    getTradingStartReportStats(dateRange),
  ]);

  const gatewayReadyTotal = stats.byGatewayStatus.find((b) => b.label === "Ready")?.count ?? 0;
  const gainfulReadyTotal = stats.byGainfulStatus.find((b) => b.label === "Ready")?.count ?? 0;
  const fundingApproved = stats.byFundingStatus.reduce((sum, f) => sum + f.totalApproved, 0);
  const fundingReceived = stats.byFundingStatus.reduce((sum, f) => sum + f.totalReceived, 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Company-wide breakdowns across every office and advisor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total participants" value={stats.totalParticipants} />
        <StatCard label="Gateway ready" value={gatewayReadyTotal} />
        <StatCard label="Gainful ready" value={gainfulReadyTotal} />
        <StatCard label="Funding approved" value={currency.format(fundingApproved)} />
        <StatCard
          label="Funding outstanding"
          value={currency.format(stats.fundingOutstanding)}
          tone={stats.fundingOutstanding > 0 ? "warning" : "default"}
        />
      </div>

      <Section title="Monthly progress" subtitle="Income and expenses reported across all participants, by month.">
        <MonthlyProgressChart points={stats.monthlyProgress} />
      </Section>

      <Section title="By office" subtitle="Compare caseload size and readiness across offices.">
        <PerformanceTable rows={stats.byOffice} nameHeader="Office" />
      </Section>

      <Section title="By advisor" subtitle="Compare caseload size and readiness across advisors.">
        <PerformanceTable
          rows={stats.byAdvisor}
          nameHeader="Advisor"
          renderName={(row) => (
            <>
              <p className="font-medium text-slate-900">{row.label}</p>
              <p className="text-xs text-slate-500">{row.officeLabel}</p>
            </>
          )}
        />
      </Section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section title="By business sector">
          <BarList items={stats.bySector} total={stats.totalParticipants} />
        </Section>

        <Section title="By business stage">
          <BarList items={stats.byStage} total={stats.totalParticipants} />
        </Section>

        <Section title="RAG distribution">
          <div className="flex flex-wrap gap-3">
            {stats.byRag.map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <Badge tone={ragTone(r.label)}>{r.label}</Badge>
                <span className="text-lg font-semibold text-slate-900">{r.count}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Gateway status">
          <BarList items={stats.byGatewayStatus} total={stats.totalParticipants} />
        </Section>

        <Section title="Gainful status">
          <BarList items={stats.byGainfulStatus} total={stats.totalParticipants} />
        </Section>

        <Section title="Funding status">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Count</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.byFundingStatus.map((f) => (
                  <tr key={f.label}>
                    <td className="px-4 py-3 font-medium text-slate-900">{f.label}</td>
                    <td className="px-4 py-3 text-slate-600">{f.count}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(f.totalApproved)}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(f.totalReceived)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">Total received across all offices: {currency.format(fundingReceived)}</p>
        </Section>
      </div>

      <div className="space-y-4 border-t border-slate-200 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Trading Start, IWT &amp; Outcomes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tsStats.periodLabel === "This month"
                ? "Period widgets below default to the current calendar month."
                : "Period widgets below reflect the selected date range."}
            </p>
          </div>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-slate-600">
              From
              <input
                type="date"
                name="from"
                defaultValue={from ?? ""}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              To
              <input
                type="date"
                name="to"
                defaultValue={to ?? ""}
                className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Apply
            </button>
            {dateRange && (
              <a
                href="/reports"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Trading Starts (period)" value={tsStats.tradingStartsInPeriod} />
          <StatCard label="Outcomes (period)" value={tsStats.outcomesInPeriod} />
          <StatCard label="IWT caseload" value={tsStats.iwtCaseloadSize} />
          <StatCard
            label="Outcome conversion rate"
            value={`${tsStats.outcomeConversionRate}%`}
          />
          <StatCard
            label="Approaching 6-month deadline"
            value={tsStats.approachingDeadline}
            tone={tsStats.approachingDeadline > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Overdue reviews"
            value={tsStats.overdueReviews}
            tone={tsStats.overdueReviews > 0 ? "danger" : "default"}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Avg days to Trading Start"
            value={tsStats.avgDaysToTradingStart ?? "—"}
          />
          <StatCard
            label="Avg days Trading Start to Outcome"
            value={tsStats.avgDaysTradingStartToOutcome ?? "—"}
          />
          <StatCard
            label="Eligible for TS, not yet processed"
            value={tsStats.eligibleNotProcessed}
            tone={tsStats.eligibleNotProcessed > 0 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Section title="Trading Starts by reason">
            <BarList
              items={tsStats.byReason.map((b) => ({ label: REASON_LABEL[b.label] ?? b.label, count: b.count }))}
              total={tsStats.tradingStartsInPeriod}
            />
          </Section>

          <Section title="Outcomes">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <Badge tone="green">Achieved</Badge>
                <span className="text-lg font-semibold text-slate-900">{tsStats.outcomesAchievedTotal}</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <Badge tone="red">Not achieved</Badge>
                <span className="text-lg font-semibold text-slate-900">{tsStats.outcomesNotAchievedTotal}</span>
              </div>
            </div>
          </Section>
        </div>

        <Section
          title="Advisor performance — Trading Starts &amp; Outcomes"
          subtitle="Attributed to the original advisor, even after the participant transfers to an IWT advisor."
        >
          {tsStats.byAdvisor.length === 0 ? (
            <p className="text-sm text-slate-500">No Trading Starts recorded yet.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Advisor</th>
                    <th className="px-4 py-3">Trading Starts</th>
                    <th className="px-4 py-3">Outcomes achieved</th>
                    <th className="px-4 py-3">Outcomes not achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tsStats.byAdvisor.map((row) => (
                    <tr key={row.advisorId}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.officeLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.tradingStarts}</td>
                      <td className="px-4 py-3 text-slate-600">{row.outcomesAchieved}</td>
                      <td className="px-4 py-3 text-slate-600">{row.outcomesNotAchieved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function BarList({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-slate-700">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${total > 0 ? Math.round((item.count / total) * 100) : 0}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium text-slate-900">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

type PerformanceRow = { label: string; count: number; gatewayReady: number; gainfulReady: number };

function PerformanceTable<T extends PerformanceRow>({
  rows,
  nameHeader,
  renderName,
}: {
  rows: T[];
  nameHeader: string;
  renderName?: (row: T) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No data yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">{nameHeader}</th>
            <th className="px-4 py-3">Participants</th>
            <th className="px-4 py-3">Gateway ready</th>
            <th className="px-4 py-3">Gainful ready</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-3">{renderName ? renderName(row) : row.label}</td>
              <td className="px-4 py-3 text-slate-600">{row.count}</td>
              <td className="px-4 py-3 text-slate-600">
                {row.gatewayReady} ({row.count > 0 ? Math.round((row.gatewayReady / row.count) * 100) : 0}%)
              </td>
              <td className="px-4 py-3 text-slate-600">
                {row.gainfulReady} ({row.count > 0 ? Math.round((row.gainfulReady / row.count) * 100) : 0}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
