"use client";

import { useActionState } from "react";
import type { ProgrammeSettings } from "@/types/database";
import {
  updateProgrammeSettings,
  type ProgrammeSettingsFormState,
} from "@/lib/actions/programme-settings";

const initialState: ProgrammeSettingsFormState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function ProgrammeSettingsForm({ settings }: { settings: ProgrammeSettings }) {
  const [state, formAction, pending] = useActionState(updateProgrammeSettings, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="NGSE two-month average threshold (£)" required>
          <input
            name="ngse_average_threshold"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={settings.ngse_average_threshold}
            className={inputClass}
          />
        </Field>
        <Field label="Outcome cumulative profit target (£)" required>
          <input
            name="outcome_target"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={settings.outcome_target}
            className={inputClass}
          />
        </Field>
        <Field label="Outcome monitoring period (months)" required>
          <input
            name="outcome_period_months"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={settings.outcome_period_months}
            className={inputClass}
          />
        </Field>
        <Field label="GSE Outcome monitoring period (months)" required>
          <input
            name="gse_outcome_period_months"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={settings.gse_outcome_period_months}
            className={inputClass}
          />
        </Field>
        <Field label="Contact period — flag participants after (days)" required>
          <input
            name="contact_period_days"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={settings.contact_period_days}
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
          {pending ? "Saving..." : "Save settings"}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>

      {settings.updated_at && (
        <p className="text-xs text-slate-500">
          Last updated {new Date(settings.updated_at).toLocaleString("en-GB")}
          {settings.updated_by ? ` by ${settings.updated_by}` : ""}. Changes apply immediately to every
          future calculation across the CRM — nothing needs redeploying.
        </p>
      )}
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
