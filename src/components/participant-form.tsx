"use client";

import { useActionState } from "react";
import type { Participant } from "@/types/database";
import type { ParticipantFormState } from "@/app/advisors/[advisorId]/participants/actions";
import { BUSINESS_SECTOR_SUGGESTIONS } from "@/lib/constants";
import Field from "@/components/ui/field";
import Button from "@/components/ui/button";

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
        <Field label="PTP Name" htmlFor="ptp_name" required size="md">
          <input
            id="ptp_name"
            name="ptp_name"
            required
            defaultValue={participant?.ptp_name}
            className={inputClass}
          />
        </Field>

        <Field label="Iconi ID" htmlFor="iconi_id" size="md">
          <input
            id="iconi_id"
            name="iconi_id"
            defaultValue={participant?.iconi_id ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            The participant&apos;s reference number in Iconi. Must be unique if set.
          </p>
        </Field>

        <Field label="Business Name" htmlFor="business_name" required size="md">
          <input
            id="business_name"
            name="business_name"
            required
            defaultValue={participant?.business_name}
            className={inputClass}
          />
        </Field>

        <Field label="Business Sector" htmlFor="business_sector" size="md">
          <input
            id="business_sector"
            name="business_sector"
            list="business-sector-options"
            placeholder="e.g. Trades, Hospitality, Retail..."
            defaultValue={participant?.business_sector ?? ""}
            className={inputClass}
          />
          <datalist id="business-sector-options">
            {BUSINESS_SECTOR_SUGGESTIONS.map((sector) => (
              <option key={sector} value={sector} />
            ))}
          </datalist>
        </Field>

        <Field label="Advisor" htmlFor="advisor_display" size="md">
          <input
            id="advisor_display"
            disabled
            value={currentAdvisorName}
            className={`${inputClass} bg-slate-50 text-slate-500`}
          />
          <p className="mt-1 text-xs text-slate-500">
            To reassign this participant, use Transfer Participant instead.
          </p>
        </Field>

        <Field label="Email" htmlFor="email" size="md">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="participant@example.com"
            defaultValue={participant?.email ?? ""}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">
            Used to match submissions from the client income tracker to this participant.
          </p>
        </Field>

        <Field label="Previous Advisor" htmlFor="previous_advisor" size="md">
          <input
            id="previous_advisor"
            name="previous_advisor"
            placeholder="If handed over from elsewhere"
            defaultValue={participant?.previous_advisor ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Scheme Start Date" htmlFor="scheme_start_date" required size="md">
          <input
            id="scheme_start_date"
            name="scheme_start_date"
            type="date"
            required
            defaultValue={participant?.scheme_start_date}
            className={inputClass}
          />
        </Field>

        <Field label="Gateway Target Date" htmlFor="gateway_target_date" size="md">
          <input
            id="gateway_target_date"
            name="gateway_target_date"
            type="date"
            defaultValue={participant?.gateway_target_date ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Website" htmlFor="website" size="md">
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
          size="md"
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
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
