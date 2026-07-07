import StatCard from "@/components/stat-card";
import Badge from "@/components/badge";
import MonthlyProgressChart from "@/components/reports/monthly-progress-chart";
import { getCompanyReportStats } from "@/lib/data/reports";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function ragTone(label: string) {
  return label === "Green" ? "green" : label === "Amber" ? "amber" : "red";
}

export default async function ReportsPage() {
  const stats = await getCompanyReportStats();

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
