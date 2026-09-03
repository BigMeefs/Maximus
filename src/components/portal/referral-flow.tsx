"use client";

import { useActionState, useState } from "react";
import type { ReferralSubmitState } from "@/lib/actions/referrals";
import Field from "@/components/ui/field";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

const initialState: ReferralSubmitState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

type ReferralOption = {
  name: string;
  action: (state: ReferralSubmitState, formData: FormData) => Promise<ReferralSubmitState>;
};

export default function ReferralFlow({ options }: { options: ReferralOption[] }) {
  const [selected, setSelected] = useState<ReferralOption | null>(null);

  if (!selected) {
    return (
      <Card padding="lg">
        <p className="mb-4 text-sm font-medium text-slate-900">
          Which SE advisor would you like to refer this participant to?
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => setSelected(option)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {option.name}
            </button>
          ))}
        </div>
      </Card>
    );
  }

  return <ReferralForm option={selected} onChangeAdvisor={() => setSelected(null)} />;
}

function ReferralForm({ option, onChangeAdvisor }: { option: ReferralOption; onChangeAdvisor: () => void }) {
  const [state, formAction, pending] = useActionState(option.action, initialState);

  if (state.success) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-lg font-semibold text-slate-900">Referral submitted successfully.</p>
        <p className="mt-1 text-sm text-slate-600">Thank you — it will be reviewed shortly.</p>
        <p className="mt-3 text-xs text-slate-400">Reference: {state.success.referralId.slice(0, 8)}</p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <p className="text-slate-600">
          SE advisor: <span className="font-medium text-slate-900">{option.name}</span>
        </p>
        <button
          type="button"
          onClick={onChangeAdvisor}
          className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          Change
        </button>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Use this form to suggest a participant who may be interested in exploring self employment.
      </p>
      <form action={formAction} className="space-y-4">
        <Field label="Advisor" required>
          <input name="referring_advisor_name" required placeholder="Your name" className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">Your name, as the person making this referral.</p>
        </Field>
        <Field label="Participant ENG" required>
          <input name="participant_eng" required className={inputClass} />
        </Field>
        <Field label="Business Idea" required>
          <textarea name="business_idea" rows={3} required className={inputClass} />
        </Field>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting..." : "Submit Referral"}
        </Button>
      </form>
    </Card>
  );
}
