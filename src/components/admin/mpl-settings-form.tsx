"use client";

import { useActionState } from "react";
import { updateMplTargets, type MplFormState } from "@/lib/actions/mpl";

const initialState: MplFormState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function MplSettingsForm({
  tradingStartsMpl,
  outcomesMpl,
}: {
  tradingStartsMpl: number | null;
  outcomesMpl: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateMplTargets, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Trading Starts MPL (per month)" required>
          <input
            name="trading_starts_mpl"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={tradingStartsMpl ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Outcomes MPL (per month)" required>
          <input
            name="outcomes_mpl"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={outcomesMpl ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save targets"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
      <p className="text-xs text-slate-500">
        Saving always sets the target starting this calendar month — it never changes the target
        that applied to any past month, so historical performance figures stay accurate.
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
