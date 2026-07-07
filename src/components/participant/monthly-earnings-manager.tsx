"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

const CHART_TABS = [
  { value: "income", label: "Income & Expenses" },
  { value: "profit", label: "Profit" },
  { value: "customers", label: "Customers" },
  { value: "hours", label: "Hours Worked" },
] as const;
type ChartTab = (typeof CHART_TABS)[number]["value"];

export default function MonthlyEarningsManager({
  participantId,
  earnings,
}: {
  participantId: string;
  earnings: MonthlyEarning[];
}) {
  const [view, setView] = useState<"table" | "chart">("table");
  const [chartTab, setChartTab] = useState<ChartTab>("income");
  const [deletingId, startDeleteTransition] = useTransition();
  const boundAction = upsertMonthlyEarning.bind(null, participantId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const chartData = earnings.map((e) => ({
    month: formatMonth(e.month),
    income: Number(e.amount),
    expenses: Number(e.expenses),
    profit: Number(e.amount) - Number(e.expenses),
    customers: e.customer_count ?? 0,
    hours: e.hours_worked ?? 0,
  }));

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4"
      >
        <Field label="Month">
          <input type="month" name="month" required className={inputClass} />
        </Field>
        <Field label="Income (£)">
          <input type="number" name="amount" step="0.01" min="0" required className={inputClass} />
        </Field>
        <Field label="Expenses (£)">
          <input type="number" name="expenses" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Hours Worked">
          <input type="number" name="hours_worked" step="0.5" min="0" className={inputClass} />
        </Field>
        <Field label="Number of Customers">
          <input type="number" name="customer_count" step="1" min="0" className={inputClass} />
        </Field>
        <Field label="Largest Customer">
          <input type="text" name="largest_customer" className={inputClass} />
        </Field>
        <Field label="Business Notes" className="col-span-2">
          <input type="text" name="notes" className={inputClass} />
        </Field>
        <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save month"}
          </button>
          {state.error && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <ToggleButton active={view === "table"} onClick={() => setView("table")}>
          Table
        </ToggleButton>
        <ToggleButton active={view === "chart"} onClick={() => setView("chart")}>
          Chart
        </ToggleButton>
        {view === "chart" && (
          <div className="ml-2 flex flex-wrap gap-2 border-l border-slate-200 pl-2">
            {CHART_TABS.map((tab) => (
              <ToggleButton
                key={tab.value}
                active={chartTab === tab.value}
                onClick={() => setChartTab(tab.value)}
              >
                {tab.label}
              </ToggleButton>
            ))}
          </div>
        )}
      </div>

      {earnings.length === 0 ? (
        <p className="text-sm text-slate-500">No monthly performance recorded yet.</p>
      ) : view === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-4">Month</th>
                <th className="py-2 pr-4">Income</th>
                <th className="py-2 pr-4">Expenses</th>
                <th className="py-2 pr-4">Profit</th>
                <th className="py-2 pr-4">Hours</th>
                <th className="py-2 pr-4">Customers</th>
                <th className="py-2 pr-4">Largest Customer</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {earnings.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-4">{formatMonth(e.month)}</td>
                  <td className="py-2 pr-4">{currency.format(Number(e.amount))}</td>
                  <td className="py-2 pr-4">{currency.format(Number(e.expenses))}</td>
                  <td className="py-2 pr-4">
                    {currency.format(Number(e.amount) - Number(e.expenses))}
                  </td>
                  <td className="py-2 pr-4">{e.hours_worked ?? "—"}</td>
                  <td className="py-2 pr-4">{e.customer_count ?? "—"}</td>
                  <td className="py-2 pr-4">{e.largest_customer ?? "—"}</td>
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
        </div>
      ) : (
        <div className="h-72 w-full max-w-2xl">
          <ResponsiveContainer width="100%" height="100%">
            {chartTab === "income" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chartTab === "profit" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => currency.format(Number(value))} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            ) : chartTab === "customers" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="customers" name="Customers" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" name="Hours worked" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      {children}
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
