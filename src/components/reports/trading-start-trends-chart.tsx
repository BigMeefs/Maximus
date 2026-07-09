"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyTrendPoint } from "@/lib/data/reports";

export default function TradingStartTrendsChart({ points }: { points: MonthlyTrendPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-500">No Trading Starts or Outcomes recorded yet.</p>;
  }

  const data = points.map((p) => ({
    label: new Date(`${p.month}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    "Trading Starts": p.tradingStarts,
    Outcomes: p.outcomes,
  }));

  return (
    <div className="h-72 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Trading Starts" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Outcomes" fill="#059669" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
