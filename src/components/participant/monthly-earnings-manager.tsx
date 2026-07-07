"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { MonthlyEarning } from "@/types/database";
import {
  deleteMonthlyEarning,
  upsertMonthlyEarning,
  type EarningsFormState,
} from "@/lib/actions/monthly-earnings";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

function formatMonth(month: string) {
  return new Date(month).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

const initialState: EarningsFormState = {};

export default function MonthlyEarningsManager({
  participantId,
  earnings,
}: {
  participantId: string;
  earnings: MonthlyEarning[];
}) {
  const [view, setView] = useState<"table" | "chart">("table");
  const [deletingId, startDeleteTransition] = useTransition();
  const boundAction = upsertMonthlyEarning.bind(null, participantId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const chartData = earnings.map((e) => ({
    month: formatMonth(e.month),
    amount: Number(e.amount),
  }));

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Month
          </label>
          <input
            type="month"
            name="month"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Earnings (£)
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            required
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {state.error && (
          <span className="text-sm text-red-600">{state.error}</span>
        )}
      </form>

      <div className="flex items-center gap-2">
        <ToggleButton active={view === "table"} onClick={() => setView("table")}>
          Table
        </ToggleButton>
        <ToggleButton active={view === "chart"} onClick={() => setView("chart")}>
          Chart
        </ToggleButton>
      </div>

      {earnings.length === 0 ? (
        <p className="text-sm text-slate-500">No earnings recorded yet.</p>
      ) : view === "table" ? (
        <table className="w-full max-w-lg text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="py-2">Month</th>
              <th className="py-2">Amount</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {earnings.map((e) => (
              <tr key={e.id}>
                <td className="py-2">{formatMonth(e.month)}</td>
                <td className="py-2">{currency.format(Number(e.amount))}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={deletingId}
                    onClick={() =>
                      startDeleteTransition(() =>
                        deleteMonthlyEarning(participantId, e.id),
                      )
                    }
                    className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-72 w-full max-w-2xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => currency.format(Number(value))}
              />
              <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
