"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyIncomePoint } from "@/lib/trading-start-rules";
import Card from "@/components/ui/card";

export default function IncomeAnalyticsChart({ monthly }: { monthly: MonthlyIncomePoint[] }) {
  if (monthly.length === 0) {
    return <p className="text-sm text-slate-500">No income tracker entries yet.</p>;
  }

  const data = monthly.map((m) => ({
    label: new Date(`${m.month}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    Income: m.income,
    Expenses: m.expense,
    "Net Profit": m.netProfit,
  }));

  return (
    <Card padding="sm" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Income" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="Net Profit" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
