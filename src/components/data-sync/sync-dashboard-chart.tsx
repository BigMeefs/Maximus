"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ImportBatch } from "@/types/database";

export default function SyncDashboardChart({ batches }: { batches: ImportBatch[] }) {
  if (batches.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No imports yet — run your first import to see activity here.
      </p>
    );
  }

  const data = [...batches].reverse().map((b) => ({
    label: new Date(b.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    Created: b.created_count,
    Updated: b.updated_count,
    Errors: b.error_count,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Created" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Updated" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Errors" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
