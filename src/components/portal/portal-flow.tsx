"use client";

import { useActionState, useState, useTransition } from "react";
import { lookupParticipantByEmail, submitPortalIncomeEntry, type PortalSubmitState } from "@/lib/actions/portal";
import { calculateMileageCost } from "@/lib/mileage";
import Field from "@/components/ui/field";
import Button from "@/components/ui/button";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

type Step =
  | { name: "email" }
  | { name: "not_found" }
  | { name: "form"; participantId: string; firstName: string };

const initialSubmitState: PortalSubmitState = {};

export default function PortalFlow() {
  const [step, setStep] = useState<Step>({ name: "email" });
  const [formKey, setFormKey] = useState(0);

  if (step.name === "email" || step.name === "not_found") {
    return (
      <EmailStep
        notFound={step.name === "not_found"}
        onMatch={(id, firstName) => setStep({ name: "form", participantId: id, firstName })}
        onNoMatch={() => setStep({ name: "not_found" })}
      />
    );
  }

  return (
    <IncomeForm
      key={formKey}
      participantId={step.participantId}
      firstName={step.firstName}
      onStartOver={() => {
        setFormKey((k) => k + 1);
        setStep({ name: "email" });
      }}
    />
  );
}

function EmailStep({
  notFound,
  onMatch,
  onNoMatch,
}: {
  notFound: boolean;
  onMatch: (participantId: string, firstName: string) => void;
  onNoMatch: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await lookupParticipantByEmail(email);
      if (result) {
        onMatch(result.id, result.firstName);
      } else {
        onNoMatch();
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-600">
        Enter the email address on your Self Employment record to submit this month&apos;s income
        tracker.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking..." : "Continue"}
        </Button>
      </form>
      {notFound && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          We couldn&apos;t find an account using that email address. Please contact your Self
          Employment Advisor.
        </p>
      )}
    </div>
  );
}

function IncomeForm({
  participantId,
  firstName,
  onStartOver,
}: {
  participantId: string;
  firstName: string;
  onStartOver: () => void;
}) {
  const boundSubmit = submitPortalIncomeEntry.bind(null);
  const [state, formAction, pending] = useActionState(boundSubmit, initialSubmitState);
  const [grossIncome, setGrossIncome] = useState("");
  const [businessExpenses, setBusinessExpenses] = useState("");
  const [miles, setMiles] = useState("");

  if (state.success) {
    return (
      <SuccessStep
        firstName={firstName}
        mileageCost={state.success.mileageCost}
        netProfit={state.success.netProfit}
        onSubmitAnother={onStartOver}
      />
    );
  }

  const mileageCost = calculateMileageCost(Number(miles) || 0);
  const netProfit = (Number(grossIncome) || 0) - (Number(businessExpenses) || 0) - mileageCost;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-600">
        Hi {firstName} — fill in this month&apos;s figures below.
      </p>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="participant_id" value={participantId} />

        <Field label="Date" required>
          <input name="entry_date" type="date" required className={inputClass} />
        </Field>
        <Field label="Gross Income (£)">
          <input
            name="gross_income"
            type="number"
            step="0.01"
            min="0"
            value={grossIncome}
            onChange={(e) => setGrossIncome(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Business Expenses (£)">
          <input
            name="business_expenses"
            type="number"
            step="0.01"
            min="0"
            value={businessExpenses}
            onChange={(e) => setBusinessExpenses(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Business Mileage (Miles)">
          <input
            name="miles"
            type="number"
            step="0.1"
            min="0"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Notes (optional)">
          <textarea name="notes" rows={2} className={inputClass} />
        </Field>
        <Field label="Upload Earnings Declaration (optional)">
          <input
            name="declaration_file"
            type="file"
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </Field>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Mileage deduction</span>
            <span className="font-medium text-slate-900">{currency.format(mileageCost)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-slate-600">Net profit</span>
            <span className="font-semibold text-slate-900">{currency.format(netProfit)}</span>
          </div>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </div>
  );
}

function SuccessStep({
  firstName,
  mileageCost,
  netProfit,
  onSubmitAnother,
}: {
  firstName: string;
  mileageCost: number;
  netProfit: number;
  onSubmitAnother: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-900">Thanks, {firstName}!</p>
      <p className="mt-1 text-sm text-slate-600">Your income tracker entry has been submitted.</p>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Mileage deduction</span>
          <span className="font-medium text-slate-900">{currency.format(mileageCost)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-slate-600">Net profit</span>
          <span className="font-semibold text-slate-900">{currency.format(netProfit)}</span>
        </div>
      </div>
      <Button type="button" variant="secondary" onClick={onSubmitAnother} className="mt-5">
        Submit another entry
      </Button>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
