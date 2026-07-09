import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import MonthlyProgressChart from "@/components/reports/monthly-progress-chart";
import TradingStartTrendsChart from "@/components/reports/trading-start-trends-chart";
import ReportFilters from "@/components/reports/report-filters";
import {
  getCompanyReportStats,
  getOfficeReportStats,
  getTradingStartReportStats,
  type ReportFilters as ReportFiltersType,
} from "@/lib/data/reports";
import { listAdvisors, listOffices } from "@/lib/data/advisor";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

const REASON_LABEL: Record<string, string> = {
  GSE: "GSE",
  NGSE: "NGSE (2 Month Average)",
  "Claim Closed Whilst Self Employed": "Claim Closed",
};

function ragTone(label: string) {
  return label === "Green" ? "green" : label === "Amber" ? "amber" : "red";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; office?: string; advisor?: string }>;
}) {
  const { from, to, office, advisor } = await searchParams;
  const dateRange = from || to ? { from, to } : undefined;
  const filters: ReportFiltersType = {
    officeId: office || undefined,
    advisorId: advisor || undefined,
    dateRange,
  };

  const [stats, tsStats, officeStats, offices, advisors] = await Promise.all([
    getCompanyReportStats(filters),
    getTradingStartReportStats(filters),
    getOfficeReportStats(filters),
    listOffices(),
    listAdvisors(),
  ]);

  const gatewayReadyTotal = stats.byGatewayStatus.find((b) => b.label === "Ready")?.count ?? 0;
  const gainfulReadyTotal = stats.byGainfulStatus.find((b) => b.label === "Ready")?.count ?? 0;
  const fundingApproved = stats.byFundingStatus.reduce((sum, f) => sum + f.totalApproved, 0);
  const fundingReceived = stats.byFundingStatus.reduce((sum, f) => sum + f.totalReceived, 0);
  const pendingFundingApprovals =
    stats.byFundingStatus.find((f) => f.label === "Pending Manager Approval")?.count ?? 0;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          The Manager Dashboard — company-wide breakdowns across every office and advisor.
        </p>
      </div>

      <ReportFilters offices={offices} advisors={advisors} />

      <a
        href="/admin/funding-approvals"
        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Funding Approval Queue</h2>
          <p className="mt-0.5 text-xs text-slate-500">Requests over £100 awaiting a manager decision.</p>
        </div>
        <Badge tone={pendingFundingApprovals > 0 ? "amber" : "green"}>
          {pendingFundingApprovals} pending
        </Badge>
      </a>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Office Overview</h2>
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

      <Section
        title="Office Reporting"
        subtitle="Trading Starts, Outcomes, funding and Income Tracker compliance, broken down by office."
      >
        {officeStats.length === 0 ? (
          <p className="text-sm text-slate-500">No offices found.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Office</th>
                  <th className="px-4 py-3">Trading Starts</th>
                  <th className="px-4 py-3">Outcomes</th>
                  <th className="px-4 py-3">GSE</th>
                  <th className="px-4 py-3">NGSE</th>
                  <th className="px-4 py-3">Claim Closed</th>
                  <th className="px-4 py-3">Active IWT</th>
                  <th className="px-4 py-3">Funding Requests</th>
                  <th className="px-4 py-3">Funding Approved</th>
                  <th className="px-4 py-3">Funding Rejected</th>
                  <th className="px-4 py-3">Income Tracker Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officeStats.map((row) => (
                  <tr key={row.officeId}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.officeName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.tradingStarts}</td>
                    <td className="px-4 py-3 text-slate-600">{row.outcomes}</td>
                    <td className="px-4 py-3 text-slate-600">{row.gseParticipants}</td>
                    <td className="px-4 py-3 text-slate-600">{row.ngseParticipants}</td>
                    <td className="px-4 py-3 text-slate-600">{row.claimClosedParticipants}</td>
                    <td className="px-4 py-3 text-slate-600">{row.activeIwt}</td>
                    <td className="px-4 py-3 text-slate-600">{row.fundingRequests}</td>
                    <td className="px-4 py-3 text-slate-600">{row.fundingApproved}</td>
                    <td className="px-4 py-3 text-slate-600">{row.fundingRejected}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <Badge tone={row.incomeTrackerCompliance >= 80 ? "green" : row.incomeTrackerCompliance >= 50 ? "amber" : "red"}>
                        {row.incomeTrackerCompliance}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Trading Start, IWT &amp; Outcomes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {tsStats.periodLabel === "This month"
              ? "Period widgets below default to the current calendar month. Use the filters above to select a date range."
              : "Period widgets below reflect the selected filters."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <StatCard label="Trading Starts (period)" value={tsStats.tradingStartsInPeriod} />
          <StatCard label="Outcomes (period)" value={tsStats.outcomesInPeriod} />
          <StatCard label="IWT caseload" value={tsStats.iwtCaseloadSize} />
          <StatCard label="Forecast Outcomes" value={tsStats.forecastOutcomes} />
          <StatCard
            label="Outcome conversion rate"
            value={`${tsStats.outcomeConversionRate}%`}
          />
          <StatCard
            label="Approaching Outcome deadline"
            value={tsStats.approachingDeadline}
            tone={tsStats.approachingDeadline > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Overdue reviews"
            value={tsStats.overdueReviews}
            tone={tsStats.overdueReviews > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Participants at risk"
            value={tsStats.participantsAtRisk}
            tone={tsStats.participantsAtRisk > 0 ? "danger" : "default"}
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
          title="Team leaderboard — Trading Starts &amp; Outcomes by advisor"
          subtitle="Sorted by Trading Starts, attributed to the original advisor even after the participant transfers to an IWT advisor."
        >
          {tsStats.byAdvisor.length === 0 ? (
            <p className="text-sm text-slate-500">No advisors found.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Advisor</th>
                    <th className="px-4 py-3">Active caseload</th>
                    <th className="px-4 py-3">Trading Starts</th>
                    <th className="px-4 py-3">Outcomes achieved</th>
                    <th className="px-4 py-3">Outcomes not achieved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tsStats.byAdvisor.map((row, index) => (
                    <tr key={row.advisorId}>
                      <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.label}</p>
                        <p className="text-xs text-slate-500">{row.officeLabel}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.activeCaseload}</td>
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

        <Section title="Monthly trends" subtitle="Trading Starts and Outcomes recorded per month, company-wide.">
          <TradingStartTrendsChart points={tsStats.monthlyTrends} />
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
