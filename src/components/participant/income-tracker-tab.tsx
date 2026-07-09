"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import type { IncomeTrackerEntry, ProgrammeSettings, TradingStart } from "@/types/database";
import {
  deleteIncomeTrackerEntry,
  upsertIncomeTrackerEntry,
  type IncomeTrackerFormState,
} from "@/lib/actions/income-tracker";
import { getDeclarationFileUrl } from "@/lib/actions/portal";
import { calculateMileageCost } from "@/lib/mileage";
import {
  computeIncomeAnalytics,
  computeMonetaryOutcomeProgress,
  computeProfitSinceTradingStart,
} from "@/lib/trading-start-rules";
import IncomeAnalyticsChart from "@/components/participant/income-analytics-chart";
import Badge from "@/components/badge";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

function formatMonth(month: string) {
  return new Date(month).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function netProfit(entry: Pick<IncomeTrackerEntry, "income" | "expense" | "mileage_cost">) {
  return Number(entry.income) - Number(entry.expense) - Number(entry.mileage_cost);
}

const initialState: IncomeTrackerFormState = {};

export default function IncomeTrackerTab({
  participantId,
  entries,
  tradingStart,
  settings,
}: {
  participantId: string;
  entries: IncomeTrackerEntry[];
  tradingStart?: TradingStart | null;
  settings: ProgrammeSettings;
}) {
  const boundUpsert = upsertIncomeTrackerEntry.bind(null, participantId);
  const [state, formAction, pending] = useActionState(boundUpsert, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [income, setIncome] = useState("");
  const [expense, setExpense] = useState("");
  const [miles, setMiles] = useState("");
  const previewMileageCost = calculateMileageCost(Number(miles) || 0);
  const previewNetProfit = (Number(income) || 0) - (Number(expense) || 0) - previewMileageCost;

  const totals = entries.reduce(
    (acc, e) => ({
      income: acc.income + Number(e.income),
      expense: acc.expense + Number(e.expense),
      mileage: acc.mileage + Number(e.mileage_cost),
    }),
    { income: 0, expense: 0, mileage: 0 },
  );

  const analytics = computeIncomeAnalytics(entries);
  const profitSinceTradingStart = tradingStart
    ? computeProfitSinceTradingStart(tradingStart.trading_start_date, entries)
    : null;
  const outcomeProgress =
    tradingStart && tradingStart.reason !== "GSE"
      ? computeMonetaryOutcomeProgress(tradingStart.trading_start_date, entries, settings)
      : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-slate-600">
          Populated automatically from the client income tracker (matched by email) — one entry per
          calendar month. Submitting a new entry for a month that already has one replaces it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Total income" value={currency.format(totals.income)} />
        <SummaryStat label="Total expenses" value={currency.format(totals.expense)} />
        <SummaryStat label="Total mileage" value={currency.format(totals.mileage)} />
        <SummaryStat
          label="Net profit"
          value={currency.format(totals.income - totals.expense - totals.mileage)}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Income Analytics</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Average monthly profit" value={currency.format(analytics.averageMonthlyProfit)} />
          <SummaryStat
            label="Highest month"
            value={analytics.highestMonth ? currency.format(analytics.highestMonth.netProfit) : "—"}
          />
          <SummaryStat
            label="Lowest month"
            value={analytics.lowestMonth ? currency.format(analytics.lowestMonth.netProfit) : "—"}
          />
          <SummaryStat
            label="Total cumulative profit"
            value={currency.format(analytics.totalCumulativeProfit)}
          />
        </div>
        {tradingStart && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              label="Profit since Trading Start"
              value={currency.format(profitSinceTradingStart ?? 0)}
            />
            {outcomeProgress && (
              <SummaryStat
                label="Profit towards Outcome"
                value={`${currency.format(outcomeProgress.cumulativeProfit)} of ${currency.format(outcomeProgress.target)}`}
              />
            )}
          </div>
        )}
        <div className="mt-4">
          <IncomeAnalyticsChart monthly={analytics.monthly} />
        </div>
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
          setIncome("");
          setExpense("");
          setMiles("");
        }}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date" required>
            <input name="entry_date" type="date" required className={inputClass} />
          </Field>
          <Field label="Income (£)">
            <input
              name="income"
              type="number"
              step="0.01"
              min="0"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Expense (£)">
            <input
              name="expense"
              type="number"
              step="0.01"
              min="0"
              value={expense}
              onChange={(e) => setExpense(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Mileage (Miles)">
            <input
              name="miles"
              type="number"
              step="0.1"
              min="0"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Mileage cost is calculated automatically — 45p/mile up to 833 miles, 25p/mile beyond.
            </p>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea name="notes" rows={2} className={inputClass} />
          </Field>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Mileage deduction</span>
            <span className="font-medium text-slate-900">{currency.format(previewMileageCost)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-600">Net profit</span>
            <span className="font-semibold text-slate-900">{currency.format(previewNetProfit)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save entry"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">
          No income tracker entries yet. Make sure this participant&apos;s Email is set on the profile
          so the tracker can match their submissions.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Date submitted</th>
                <th className="px-4 py-3">Income</th>
                <th className="px-4 py-3">Expense</th>
                <th className="px-4 py-3">Miles</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Net Profit</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...entries].reverse().map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatMonth(entry.month)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(entry.entry_date).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{currency.format(Number(entry.income))}</td>
                  <td className="px-4 py-3 text-slate-600">{currency.format(Number(entry.expense))}</td>
                  <td className="px-4 py-3 text-slate-600">{Number(entry.miles) || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {currency.format(Number(entry.mileage_cost))}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {currency.format(netProfit(entry))}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {entry.source}
                    {entry.declaration_file_path && (
                      <>
                        {" · "}
                        <DeclarationLink filePath={entry.declaration_file_path} />
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.source === "Participant Portal" ? (
                      entry.reviewed ? (
                        <Badge tone="green">
                          Reviewed{entry.reviewed_by ? ` by ${entry.reviewed_by}` : ""}
                        </Badge>
                      ) : (
                        <Badge tone="amber">Awaiting review</Badge>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteButton entryId={entry.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeclarationLink({ filePath }: { filePath: string }) {
  const [opening, startOpenTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={opening}
      onClick={() =>
        startOpenTransition(async () => {
          const url = await getDeclarationFileUrl(filePath);
          if (url) window.open(url, "_blank", "noopener,noreferrer");
        })
      }
      className="font-medium text-indigo-600 hover:underline disabled:opacity-60"
    >
      View declaration
    </button>
  );
}

function DeleteButton({ entryId }: { entryId: string }) {
  const [deleting, startDeleteTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={deleting}
      onClick={() => {
        if (confirm("Delete this income tracker entry?")) {
          startDeleteTransition(() => deleteIncomeTrackerEntry(entryId));
        }
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
