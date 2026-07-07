"use client";

import { useActionState } from "react";
import type { Participant } from "@/types/database";
import type { ParticipantFormState } from "@/app/(app)/participants/actions";
import { ADVISOR_NAMES } from "@/lib/constants";

const initialState: ParticipantFormState = {};

export default function ParticipantForm({
  currentAdvisorName,
  participant,
  action,
  submitLabel,
}: {
  currentAdvisorName: string;
  participant?: Participant;
  action: (
    state: ParticipantFormState,
    formData: FormData,
  ) => Promise<ParticipantFormState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="PTP Name" htmlFor="ptp_name" required>
          <input
            id="ptp_name"
            name="ptp_name"
            required
            defaultValue={participant?.ptp_name}
            className={inputClass}
          />
        </Field>

        <Field label="Business Name" htmlFor="business_name" required>
          <input
            id="business_name"
            name="business_name"
            required
            defaultValue={participant?.business_name}
            className={inputClass}
          />
        </Field>

        <Field label="Advisor" htmlFor="advisor_name" required>
          <select
            id="advisor_name"
            name="advisor_name"
            required
            defaultValue={participant?.advisor_name ?? currentAdvisorName}
            className={inputClass}
          >
            {ADVISOR_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Previous Advisor" htmlFor="previous_advisor">
          <select
            id="previous_advisor"
            name="previous_advisor"
            defaultValue={participant?.previous_advisor ?? ""}
            className={inputClass}
          >
            <option value="">None</option>
            {ADVISOR_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Scheme Start Date" htmlFor="scheme_start_date" required>
          <input
            id="scheme_start_date"
            name="scheme_start_date"
            type="date"
            required
            defaultValue={participant?.scheme_start_date}
            className={inputClass}
          />
        </Field>

        <Field label="Website" htmlFor="website">
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://example.com"
            defaultValue={participant?.website ?? ""}
            className={inputClass}
          />
        </Field>

        <Field
          label="Social Media Links"
          htmlFor="social_media_links"
          className="sm:col-span-2"
        >
          <textarea
            id="social_media_links"
            name="social_media_links"
            rows={2}
            placeholder="Instagram, Facebook, LinkedIn URLs..."
            defaultValue={participant?.social_media_links ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function Field({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
