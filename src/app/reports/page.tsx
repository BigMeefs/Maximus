import Link from "next/link";
import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import TradingStartTrendsChart from "@/components/reports/trading-start-trends-chart";
import ReportFilters from "@/components/reports/report-filters";
import AdvisorPerformanceTable from "@/components/reports/advisor-performance-table";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import {
  getCompanyReportStats,
  getExpenseApprovalReport,
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

  const [stats, tsStats, officeStats, offices, advisors, expenseReport] = await Promise.all([
    getCompanyReportStats(filters),
    getTradingStartReportStats(filters),
    getOfficeReportStats(filters),
    listOffices(),
    listAdvisors(),
    getExpenseApprovalReport(filters),
  ]);

  const gatewayReadyTotal = stats.byGatewayStatus.find((b) => b.label === "Ready")?.count ?? 0;
  const gatewayCompletedTotal = stats.byGatewayBookingStatus.find((b) => b.label === "Completed")?.count ?? 0;
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
        <StatCard label="Gateway completed" value={gatewayCompletedTotal} />
        <StatCard label="Funding approved" value={currency.format(fundingApproved)} />
        <StatCard
          label="Funding outstanding"
          value={currency.format(stats.fundingOutstanding)}
          tone={stats.fundingOutstanding > 0 ? "warning" : "default"}
        />
        </div>
      </div>

      <Section title="Expenses" subtitle="Funding requests by month, broken down by approval status.">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <THead>
              <tr>
                <Th>Month</Th>
                <Th>Approved</Th>
                <Th>Pending</Th>
                <Th>Rejected</Th>
              </tr>
            </THead>
            <TBody>
              {expenseReport.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.monthLabel}</td>
                  <td className="px-4 py-3">
                    <Badge tone="green">{row.approved}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="amber">{row.pending}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="red">{row.rejected}</Badge>
                  </td>
                </tr>
              ))}
            </TBody>
          </Table>
        </div>
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
            <Table>
              <THead>
                <tr>
                  <Th>Office</Th>
                  <Th>Trading Starts</Th>
                  <Th>Outcomes</Th>
                  <Th>GSE</Th>
                  <Th>NGSE</Th>
                  <Th>Claim Closed</Th>
                  <Th>Active IWT</Th>
                  <Th>Funding Requests</Th>
                  <Th>Funding Approved</Th>
                  <Th>Funding Rejected</Th>
                  <Th>Income Tracker Compliance</Th>
                </tr>
              </THead>
              <TBody>
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
              </TBody>
            </Table>
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

        <Section title="Gateway booking status">
          <BarList items={stats.byGatewayBookingStatus} total={stats.totalParticipants} />
        </Section>

        <Section title="Funding status">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Table>
              <THead>
                <tr>
                  <Th>Status</Th>
                  <Th>Count</Th>
                  <Th>Approved</Th>
                  <Th>Received</Th>
                </tr>
              </THead>
              <TBody>
                {stats.byFundingStatus.map((f) => (
                  <tr key={f.label}>
                    <td className="px-4 py-3 font-medium text-slate-900">{f.label}</td>
                    <td className="px-4 py-3 text-slate-600">{f.count}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(f.totalApproved)}</td>
                    <td className="px-4 py-3 text-slate-600">{currency.format(f.totalReceived)}</td>
                  </tr>
                ))}
              </TBody>
            </Table>
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
          subtitle="Attributed to the original advisor even after the participant transfers to an IWT advisor. Sort any column, search by advisor or office, and export the current view to CSV."
        >
          <AdvisorPerformanceTable
            rows={tsStats.byAdvisor.map((row) => ({
              advisorId: row.advisorId,
              advisorName: row.label,
              officeLabel: row.officeLabel,
              tradingStarts: row.tradingStarts,
              outcomesAchieved: row.outcomesAchieved,
              conversionRate: row.conversionRate,
              currentCaseload: row.activeCaseload,
              iwtCaseload: row.iwtCaseload,
            }))}
            exportFilename="team-leaderboard.csv"
          />
        </Section>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Want to compare performance month by month, or as a chart?{" "}
            <Link href="/reports/performance-tracker" className="font-medium text-indigo-600 hover:underline">
              Open the Performance Tracker →
            </Link>
          </p>
        </div>

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

type PerformanceRow = { label: string; count: number; gatewayReady: number; gatewayCompleted: number };

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
      <Table>
        <THead>
          <tr>
            <Th>{nameHeader}</Th>
            <Th>Participants</Th>
            <Th>Gateway ready</Th>
            <Th>Gateway completed</Th>
          </tr>
        </THead>
        <TBody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-4 py-3">{renderName ? renderName(row) : row.label}</td>
              <td className="px-4 py-3 text-slate-600">{row.count}</td>
              <td className="px-4 py-3 text-slate-600">
                {row.gatewayReady} ({row.count > 0 ? Math.round((row.gatewayReady / row.count) * 100) : 0}%)
              </td>
              <td className="px-4 py-3 text-slate-600">
                {row.gatewayCompleted} ({row.count > 0 ? Math.round((row.gatewayCompleted / row.count) * 100) : 0}%)
              </td>
            </tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
