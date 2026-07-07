"use client";

import { useActionState } from "react";
import type { HmrcBusinessInfo } from "@/types/database";
import { updateHmrcInfo, type HmrcFormState } from "@/lib/actions/hmrc";

const initialState: HmrcFormState = {};

export default function HmrcTab({
  participantId,
  hmrc,
}: {
  participantId: string;
  hmrc: HmrcBusinessInfo | null;
}) {
  const boundAction = updateHmrcInfo.bind(null, participantId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Business Structure">
          <select
            name="business_structure"
            defaultValue={hmrc?.business_structure ?? ""}
            className={inputClass}
          >
            <option value="">Not set</option>
            <option value="Sole Trader">Sole Trader</option>
            <option value="Limited Company">Limited Company</option>
          </select>
        </Field>

        <Field label="UTR Number">
          <input
            name="utr_number"
            defaultValue={hmrc?.utr_number ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="HMRC Registration Date">
          <input
            name="hmrc_registration_date"
            type="date"
            defaultValue={hmrc?.hmrc_registration_date ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Insurance Status">
          <input
            name="insurance_status"
            placeholder="e.g. Public liability arranged"
            defaultValue={hmrc?.insurance_status ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Accountant Name">
          <input
            name="accountant_name"
            defaultValue={hmrc?.accountant_name ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Accountant Contact">
          <input
            name="accountant_contact"
            defaultValue={hmrc?.accountant_contact ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-8">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="vat_registered"
              defaultChecked={hmrc?.vat_registered ?? false}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            VAT Registered
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="paye_registered"
              defaultChecked={hmrc?.paye_registered ?? false}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            PAYE Registered
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="business_bank_account"
              defaultChecked={hmrc?.business_bank_account ?? false}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Business Bank Account
          </label>
        </div>

        <Field label="Tax Deadline Notes" className="sm:col-span-2">
          <textarea
            name="tax_deadline_notes"
            rows={3}
            defaultValue={hmrc?.tax_deadline_notes ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save HMRC & business information"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

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
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
