"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonthlyProgressPoint } from "@/lib/data/reports";
import Card from "@/components/ui/card";

export default function MonthlyProgressChart({ points }: { points: MonthlyProgressPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-slate-500">No monthly performance data recorded yet.</p>;
  }

  const data = points.map((p) => ({
    label: new Date(`${p.month}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    Income: p.income,
    Expenses: p.expenses,
  }));

  return (
    <Card padding="sm" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Income" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
