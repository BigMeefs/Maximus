"use client";

import { useActionState, useMemo, useState } from "react";
import clsx from "clsx";
import type {
  IncomeTrackerEntry,
  IwtReview,
  OutcomeRecord,
  TradingStart,
  TradingStartReason,
} from "@/types/database";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import {
  computeGseOutcomeProgress,
  computeMonetaryOutcomeProgress,
  detectNgseEligibility,
  getOutcomeDeadline,
  isReviewOverdue,
} from "@/lib/trading-start-rules";
import { computeParticipantHealth, type ParticipantHealth } from "@/lib/participant-health";
import HealthBadge from "@/components/participant/health-badge";
import Badge from "@/components/badge";
import {
  addIwtReview,
  createTradingStart,
  recordOutcome,
  type TradingStartFormState,
} from "@/lib/actions/trading-start";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const initialState: TradingStartFormState = {};

const REASON_LABEL: Record<TradingStartReason, string> = {
  GSE: "Gainfully Self Employed (GSE)",
  NGSE: "Non-Gainfully Self Employed (NGSE)",
  "Claim Closed Whilst Self Employed": "Claim Closed Whilst Self Employed",
};

export default function TradingStartTab({
  participantId,
  advisorId,
  advisors,
  incomeTrackerEntries,
  currentTradingStart,
  iwtReviews,
  outcome,
}: {
  participantId: string;
  advisorId: string;
  advisors: AdvisorWithOffice[];
  incomeTrackerEntries: IncomeTrackerEntry[];
  currentTradingStart: TradingStart | null;
  iwtReviews: IwtReview[];
  outcome: OutcomeRecord | null;
}) {
  const advisorNameById = useMemo(
    () => new Map(advisors.map((a) => [a.id, a.full_name])),
    [advisors],
  );

  if (!currentTradingStart) {
    return (
      <NoTradingStart
        participantId={participantId}
        advisorId={advisorId}
        advisors={advisors}
        incomeTrackerEntries={incomeTrackerEntries}
      />
    );
  }

  const health = !outcome
    ? computeParticipantHealth(currentTradingStart, incomeTrackerEntries, iwtReviews)
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      <TradingStartDetailsPanel
        tradingStart={currentTradingStart}
        advisorNameById={advisorNameById}
        health={health}
      />

      <IwtPanel
        tradingStart={currentTradingStart}
        advisorId={advisorId}
        reviews={iwtReviews}
        advisorNameById={advisorNameById}
      />

      <OutcomeSection
        participantId={participantId}
        advisorId={advisorId}
        tradingStart={currentTradingStart}
        incomeTrackerEntries={incomeTrackerEntries}
        outcome={outcome}
      />
    </div>
  );
}

function NoTradingStart({
  participantId,
  advisorId,
  advisors,
  incomeTrackerEntries,
}: {
  participantId: string;
  advisorId: string;
  advisors: AdvisorWithOffice[];
  incomeTrackerEntries: IncomeTrackerEntry[];
}) {
  const [showForm, setShowForm] = useState(false);
  const eligibility = detectNgseEligibility(incomeTrackerEntries);
  const boundAction = createTradingStart.bind(null, participantId, advisorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-slate-500">
        No Trading Start recorded yet. Once one is created, this participant moves into In Work
        Tracking and is assigned to an IWT advisor.
      </p>

      {eligibility.eligible && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Eligible for NGSE Trading Start
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Net profit exceeded £900 in two consecutive months (
            {eligibility.qualifyingMonths.join(" and ")}), from the Income Tracker. Confirm below
            if a Trading Start should be created.
          </p>
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Create Trading Start
        </button>
      ) : (
        <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Trading Start Date" required>
              <input
                type="date"
                name="trading_start_date"
                required
                defaultValue={eligibility.qualifyingMonths[1] ? `${eligibility.qualifyingMonths[1]}-01` : ""}
                className={inputClass}
              />
            </Field>
            <Field label="Trading Start Reason" required>
              <select
                name="reason"
                required
                defaultValue={eligibility.eligible ? "NGSE" : ""}
                className={inputClass}
              >
                <option value="" disabled>
                  Select reason
                </option>
                {(Object.keys(REASON_LABEL) as TradingStartReason[]).map((reason) => (
                  <option key={reason} value={reason}>
                    {REASON_LABEL[reason]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assigned IWT Advisor" required>
              <select name="iwt_advisor_id" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select advisor
                </option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name} ({a.office_name})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Transfer Date">
              <input type="date" name="transfer_date" className={inputClass} />
              <p className="mt-1 text-xs text-slate-500">Defaults to the Trading Start date if left blank.</p>
            </Field>
            <Field label="Evidence / Notes" className="sm:col-span-2">
              <textarea name="evidence_notes" rows={3} className={inputClass} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {pending ? "Creating..." : "Confirm Trading Start"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

function TradingStartDetailsPanel({
  tradingStart,
  advisorNameById,
  health,
}: {
  tradingStart: TradingStart;
  advisorNameById: Map<string, string>;
  health: ParticipantHealth | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Trading Start</h3>
        {health && <HealthBadge tone={health.tone} label={health.label} />}
      </div>
      {health && health.tone !== "green" && (
        <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
          {health.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Info label="Trading Start Date">
          {new Date(tradingStart.trading_start_date).toLocaleDateString("en-GB")}
        </Info>
        <Info label="Reason">{REASON_LABEL[tradingStart.reason]}</Info>
        <Info label="Original Advisor">
          {advisorNameById.get(tradingStart.original_advisor_id) ?? "Unknown"}
        </Info>
        <Info label="Assigned IWT Advisor">
          {advisorNameById.get(tradingStart.iwt_advisor_id) ?? "Unknown"}
        </Info>
        <Info label="Transfer Date">
          {new Date(tradingStart.transfer_date).toLocaleDateString("en-GB")}
        </Info>
        <Info label="Evidence / Notes" className="col-span-2 sm:col-span-3">
          {tradingStart.evidence_notes || "—"}
        </Info>
      </dl>
    </div>
  );
}

function IwtPanel({
  tradingStart,
  advisorId,
  reviews,
  advisorNameById,
}: {
  tradingStart: TradingStart;
  advisorId: string;
  reviews: IwtReview[];
  advisorNameById: Map<string, string>;
}) {
  const deadline = getOutcomeDeadline(tradingStart.trading_start_date);
  const nextReviewDate = reviews[0]?.next_review_date ?? null;
  const overdue = isReviewOverdue(nextReviewDate);

  const boundAction = addIwtReview.bind(null, tradingStart.id, advisorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">In Work Tracking</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Info label="Months since TS">{deadline.monthsElapsed}</Info>
        <Info label="Months remaining">{deadline.monthsRemaining}</Info>
        <Info label="Current IWT Advisor">
          {advisorNameById.get(tradingStart.iwt_advisor_id) ?? "Unknown"}
        </Info>
        <Info label="Next Review Date">
          {nextReviewDate ? (
            <span className={clsx(overdue && "font-semibold text-red-600")}>
              {new Date(nextReviewDate).toLocaleDateString("en-GB")}
              {overdue && " (overdue)"}
            </span>
          ) : (
            "Not yet scheduled"
          )}
        </Info>
      </dl>

      {reviews.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {reviews.map((review) => (
            <li key={review.id} className="px-3 py-2 text-sm">
              <p className="font-medium text-slate-800">
                Reviewed {new Date(review.review_date).toLocaleDateString("en-GB")}
                {review.next_review_date &&
                  ` — next review ${new Date(review.next_review_date).toLocaleDateString("en-GB")}`}
              </p>
              {review.notes && <p className="mt-0.5 text-slate-600">{review.notes}</p>}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Review Date" required>
            <input type="date" name="review_date" required className={inputClass} />
          </Field>
          <Field label="Next Review Date">
            <input type="date" name="next_review_date" className={inputClass} />
          </Field>
          <Field label="Review Notes" className="sm:col-span-2">
            <textarea name="notes" rows={2} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Log review"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}

function OutcomeSection({
  participantId,
  advisorId,
  tradingStart,
  incomeTrackerEntries,
  outcome,
}: {
  participantId: string;
  advisorId: string;
  tradingStart: TradingStart;
  incomeTrackerEntries: IncomeTrackerEntry[];
  outcome: OutcomeRecord | null;
}) {
  const isMonetary = tradingStart.reason !== "GSE";
  const monetary = isMonetary
    ? computeMonetaryOutcomeProgress(tradingStart.trading_start_date, incomeTrackerEntries)
    : null;
  const gse = !isMonetary ? computeGseOutcomeProgress(tradingStart.trading_start_date) : null;

  const boundAction = recordOutcome.bind(null, tradingStart.id, participantId, advisorId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const autoAchieved = !outcome && monetary?.isAchieved;

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Outcome</h3>

      {monetary && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              {currency.format(monetary.cumulativeProfit)} of {currency.format(monetary.target)}
            </span>
            <span className="font-semibold text-slate-900">{monetary.percentComplete}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                monetary.isAchieved ? "bg-emerald-500" : "bg-indigo-500",
              )}
              style={{ width: `${monetary.percentComplete}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">
            <span>Remaining: {currency.format(monetary.remaining)}</span>
            <span>Months elapsed: {monetary.monthsElapsed}</span>
            <span>Months remaining: {monetary.monthsRemaining}</span>
            <span>Deadline: {new Date(monetary.deadlineDate).toLocaleDateString("en-GB")}</span>
          </div>
        </div>
      )}

      {gse && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Info label="Months elapsed">{gse.monthsElapsed}</Info>
          <Info label="Months remaining">{gse.monthsRemaining}</Info>
          <Info label="Deadline">{new Date(gse.deadlineDate).toLocaleDateString("en-GB")}</Info>
          <Info label="6-month period complete">{gse.readyToConfirm ? "Yes" : "No"}</Info>
        </div>
      )}

      {autoAchieved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Badge tone="green">Outcome Ready</Badge>
          Cumulative net profit hit £5,300 within 6 months. Confirm the outcome below.
        </div>
      )}

      {!outcome && !isMonetary && gse?.readyToConfirm && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Badge tone="green">Outcome Ready</Badge>
          The full 6-month gainful period is complete. Confirm the outcome below.
        </div>
      )}

      {outcome && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">
            Outcome recorded: {outcome.outcome_achieved ? "Achieved" : "Not achieved"} on{" "}
            {new Date(outcome.outcome_date).toLocaleDateString("en-GB")}
          </p>
        </div>
      )}

      <form action={formAction} className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Outcome Date" required>
            <input
              type="date"
              name="outcome_date"
              required
              defaultValue={outcome?.outcome_date ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Outcome Type" required>
            <select
              name="outcome_type"
              required
              defaultValue={outcome?.outcome_type ?? tradingStart.reason}
              className={inputClass}
            >
              {(Object.keys(REASON_LABEL) as TradingStartReason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {REASON_LABEL[reason]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outcome Achieved" required>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="outcome_achieved"
                  value="yes"
                  defaultChecked={outcome?.outcome_achieved ?? autoAchieved ?? false}
                  required
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="outcome_achieved"
                  value="no"
                  defaultChecked={outcome ? !outcome.outcome_achieved : false}
                  required
                />
                No
              </label>
            </div>
          </Field>
          <Field label="Evidence" className="sm:col-span-2">
            <textarea
              name="evidence"
              rows={2}
              defaultValue={outcome?.evidence ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Advisor Notes" className="sm:col-span-2">
            <textarea
              name="advisor_notes"
              rows={2}
              defaultValue={outcome?.advisor_notes ?? ""}
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
            {pending ? "Saving..." : outcome ? "Update outcome" : "Record outcome"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
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

function Info({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}
