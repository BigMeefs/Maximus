import StatCard from "@/components/stat-card";
import PerformanceFilters from "@/components/reports/performance-filters";
import AdvisorPerformanceTable from "@/components/reports/advisor-performance-table";
import TradingStartTrendsChart from "@/components/reports/trading-start-trends-chart";
import MonthlyBreakdownChart from "@/components/reports/monthly-breakdown-chart";
import { getPerformanceTrackerData, type PerformanceTrackerFilters } from "@/lib/data/performance-tracker";
import { listAdvisors, listOffices } from "@/lib/data/advisor";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PerformanceTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; office?: string; advisor?: string }>;
}) {
  const { month, year, office, advisor } = await searchParams;
  const filters: PerformanceTrackerFilters = {
    month: month ? Number(month) : undefined,
    year: year ? Number(year) : undefined,
    officeId: office || undefined,
    advisorId: advisor || undefined,
  };

  const [data, offices, advisors] = await Promise.all([
    getPerformanceTrackerData(filters),
    listOffices(),
    listAdvisors(),
  ]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const periodLabel = filters.month && filters.year
    ? `${MONTH_NAMES[filters.month - 1]} ${filters.year}`
    : filters.year
      ? String(filters.year)
      : filters.month
        ? `${MONTH_NAMES[filters.month - 1]} (all years)`
        : "All time";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Performance Tracker</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trading Starts and Outcomes stay credited to the advisor who originally created the Trading
          Start, even after a participant transfers to an IWT advisor. Filter by Month, Year, Office or
          Advisor — totals and charts update immediately.
        </p>
      </div>

      <PerformanceFilters offices={offices} advisors={advisors} years={years} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">{periodLabel}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Trading Starts Achieved" value={data.totals.tradingStarts} />
          <StatCard label="Outcomes Achieved" value={data.totals.outcomesAchieved} />
          <StatCard label="Conversion Rate" value={`${data.totals.conversionRate}%`} />
          <StatCard label="Current Caseload" value={data.totals.currentCaseload} />
          <StatCard label="Participants in IWT" value={data.totals.iwtCaseload} />
          <StatCard
            label="Avg. Time to Outcome"
            value={data.totals.avgDaysToOutcome !== null ? `${data.totals.avgDaysToOutcome}d` : "—"}
          />
        </div>
      </div>

      <Section
        title="Trading Starts &amp; Outcomes by month"
        subtitle={filters.year ? `Showing ${filters.year}.` : "Showing the last 12 months."}
      >
        <TradingStartTrendsChart points={data.monthlyTrends} />
      </Section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section title="Advisor performance by month" subtitle="Trading Starts per month, by original advisor.">
          <MonthlyBreakdownChart
            points={data.byAdvisorMonthly}
            seriesTotals={data.byAdvisorMonthlyTotals}
            emptyText="No Trading Starts recorded yet."
          />
        </Section>
        <Section title="Office performance by month" subtitle="Trading Starts per month, by office.">
          <MonthlyBreakdownChart
            points={data.byOfficeMonthly}
            seriesTotals={data.byOfficeMonthlyTotals}
            emptyText="No Trading Starts recorded yet."
          />
        </Section>
      </div>

      <Section
        title="By advisor"
        subtitle="Sort any column, search by advisor or office, and export the current view to CSV."
      >
        <AdvisorPerformanceTable rows={data.byAdvisor} exportFilename="performance-tracker.csv" />
      </Section>
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
