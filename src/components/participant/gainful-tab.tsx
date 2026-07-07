"use client";

import { useTransition } from "react";
import clsx from "clsx";
import type { ChecklistEntry } from "@/lib/business-rules";
import type { GainfulAssessment, GainfulRecommendation } from "@/types/database";
import { updateGainfulAssessment } from "@/lib/actions/gainful";

const RECOMMENDATIONS: { value: GainfulRecommendation; label: string; tone: string }[] = [
  { value: "Ready", label: "🟢 Ready", tone: "text-emerald-700" },
  { value: "Needs Further Evidence", label: "🟡 Needs Further Evidence", tone: "text-amber-700" },
  { value: "Not Yet Ready", label: "🔴 Not Yet Ready", tone: "text-red-700" },
];

const CHECKLIST_FIELD_MAP: Record<string, keyof GainfulAssessment> = {
  "Trading Consistently": "trading_consistently",
  "Hours Worked Adequate": "hours_worked_adequate",
  "Bank Statements Provided": "bank_statements_provided",
  "Customer Base Established": "customer_base_established",
  "Business Sustainable": "business_sustainable",
};

export default function GainfulTab({
  participantId,
  entries,
  percent,
  gainful,
}: {
  participantId: string;
  entries: ChecklistEntry[];
  percent: number;
  gainful: GainfulAssessment | null;
}) {
  const [pending, startTransition] = useTransition();
  const boundAction = updateGainfulAssessment.bind(null, participantId);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold text-slate-900">Gainful Readiness Evidence</h3>
          <span className="font-semibold text-slate-900">{percent}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              percent >= 90 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {entries.map((entry) => {
          const field = CHECKLIST_FIELD_MAP[entry.label];
          return (
            <li
              key={entry.label}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <span className="text-sm text-slate-800">{entry.label}</span>
              {entry.source === "auto" ? (
                <span
                  className={clsx(
                    "text-xs font-medium",
                    entry.complete ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  {entry.complete ? "Met (auto)" : "Not yet (auto)"}
                </span>
              ) : (
                <input
                  type="checkbox"
                  defaultChecked={entry.complete}
                  disabled={pending}
                  form="gainful-assessment-form"
                  name={field}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              )}
            </li>
          );
        })}
      </ul>

      <form
        id="gainful-assessment-form"
        action={(formData) => startTransition(() => boundAction(formData))}
        className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Advisor Recommendation
          </label>
          <textarea
            name="advisor_recommendation"
            rows={3}
            defaultValue={gainful?.advisor_recommendation ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            placeholder="Summarise why this participant is/isn't ready for a Gainful decision..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="manager_approval"
            defaultChecked={gainful?.manager_approval ?? false}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Manager approval given
        </label>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Manager Notes
          </label>
          <textarea
            name="manager_notes"
            rows={2}
            defaultValue={gainful?.manager_notes ?? ""}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Overall Recommendation
          </label>
          <div className="flex flex-wrap gap-3">
            {RECOMMENDATIONS.map((rec) => (
              <label
                key={rec.value}
                className={clsx(
                  "flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm",
                  rec.tone,
                )}
              >
                <input
                  type="radio"
                  name="overall_recommendation"
                  value={rec.value}
                  defaultChecked={
                    (gainful?.overall_recommendation ?? "Not Yet Ready") === rec.value
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                {rec.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save assessment"}
        </button>
      </form>
    </div>
  );
}
