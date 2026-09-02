"use client";

import { useActionState } from "react";
import { submitReferral, type ReferralSubmitState } from "@/lib/actions/referrals";

const initialState: ReferralSubmitState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function ReferralForm({
  advisorId,
  advisorName,
}: {
  advisorId: string;
  advisorName: string;
}) {
  // advisorId is bound into the Server Action reference itself, not a
  // client-editable form field — a colleague filling in this form has no
  // way to change which advisor the referral goes to.
  const boundAction = submitReferral.bind(null, advisorId, advisorName);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Referral submitted successfully.</p>
        <p className="mt-1 text-sm text-slate-600">Thank you — {advisorName} will review it shortly.</p>
        <p className="mt-3 text-xs text-slate-400">Reference: {state.success.referralId.slice(0, 8)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-600">
        Use this form to suggest a participant who may be interested in exploring self employment. This
        referral will go to <span className="font-medium text-slate-900">{advisorName}</span>.
      </p>
      <form action={formAction} className="space-y-4">
        <Field label="Participant Name" required>
          <input name="participant_name" required className={inputClass} />
        </Field>
        <Field label="Participant ENG" required>
          <input name="participant_eng" required className={inputClass} />
        </Field>
        <Field label="Business Idea" required>
          <textarea name="business_idea" rows={3} required className={inputClass} />
        </Field>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Submitting..." : "Submit Referral"}
        </button>
      </form>
    </div>
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
