"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Fixed-order categorical palette (existing Tailwind 600-weight hues already
// used elsewhere in this app's badges/charts) — series keep the same color
// across re-renders since colors are assigned by array position, not cycled.
const SERIES_COLORS = ["#4f46e5", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
const MAX_SERIES = 8;

export type MonthlySeriesPoint = { month: string } & Record<string, string | number>;

// Generic monthly, multi-series bar chart — reused for both "Advisor
// Performance by Month" (series = advisor names) and "Office Performance by
// Month" (series = office names); the entity being broken down is just
// whichever keys are present in `points` besides "month".
export default function MonthlyBreakdownChart({
  points,
  seriesTotals,
  emptyText,
}: {
  points: MonthlySeriesPoint[];
  /** Total per series across all points, used to pick which series to show when there are more than MAX_SERIES. */
  seriesTotals: Record<string, number>;
  emptyText: string;
}) {
  const allSeries = Object.keys(seriesTotals).sort((a, b) => seriesTotals[b] - seriesTotals[a]);
  const shownSeries = allSeries.slice(0, MAX_SERIES);
  const hiddenCount = allSeries.length - shownSeries.length;

  if (points.length === 0 || shownSeries.length === 0) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  const data = points.map((p) => ({
    ...p,
    label: new Date(`${p.month}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
  }));

  return (
    <div className="space-y-2">
      <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            {shownSeries.map((name, i) => (
              <Bar key={name} dataKey={name} stackId="a" fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hiddenCount > 0 && (
        <p className="text-xs text-slate-500">
          Showing the top {MAX_SERIES} by volume — {hiddenCount} more hidden. Use the filters above to narrow the view.
        </p>
      )}
    </div>
  );
}
