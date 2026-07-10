"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { FUNDING_SOURCES, type FundingApplicationStatus, type FundingRecord } from "@/types/database";
import Badge from "@/components/badge";
import {
  createFundingRecord,
  deleteFundingRecord,
  getFundingDocumentUrl,
  updateFundingRecord,
  uploadFundingDocument,
  type FundingFormState,
} from "@/lib/actions/funding";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const initialState: FundingFormState = {};

function fundingStatusTone(status: FundingApplicationStatus) {
  switch (status) {
    case "Approved":
    case "Received":
      return "green" as const;
    case "Pending Manager Approval":
      return "amber" as const;
    case "Declined":
      return "red" as const;
    default:
      return "slate" as const;
  }
}

export default function FundingTab({
  participantId,
  records,
}: {
  participantId: string;
  records: FundingRecord[];
}) {
  const boundCreate = createFundingRecord.bind(null, participantId);
  const [state, formAction, pending] = useActionState(boundCreate, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const totals = records.reduce(
    (acc, r) => ({
      requested: acc.requested + (Number(r.amount_requested) || 0),
      approved: acc.approved + (Number(r.amount_approved) || 0),
      received: acc.received + (Number(r.amount_received) || 0),
    }),
    { requested: 0, approved: 0, received: 0 },
  );
  const remaining = totals.approved - totals.received;

  return (
    <div className="max-w-3xl space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Requested" value={currency.format(totals.requested)} />
        <SummaryStat label="Approved" value={currency.format(totals.approved)} />
        <SummaryStat label="Received" value={currency.format(totals.received)} />
        <SummaryStat label="Remaining" value={currency.format(remaining)} />
      </div>

      {totals.approved > 0 && (
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${Math.min(100, Math.round((totals.received / totals.approved) * 100))}%`,
            }}
          />
        </div>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Funding Source" required>
            <select name="funding_source" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a funding source
              </option>
              {FUNDING_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount Requested (£)">
            <input name="amount_requested" type="number" step="0.01" min="0" className={inputClass} />
            <p className="mt-1 text-xs text-slate-500">
              £100 or below approves automatically; above £100 goes to a manager for approval.
            </p>
          </Field>
          <Field label="Amount Received (£)">
            <input name="amount_received" type="number" step="0.01" min="0" className={inputClass} />
          </Field>
          <Field label="Funding Purpose">
            <input name="funding_purpose" className={inputClass} />
          </Field>
          <Field label="Application Date">
            <input name="application_date" type="date" className={inputClass} />
          </Field>
          <Field label="Decision Date">
            <input name="decision_date" type="date" className={inputClass} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea name="notes" rows={2} className={inputClass} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Add funding record"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      {records.length === 0 ? (
        <p className="text-sm text-slate-500">No funding records yet.</p>
      ) : (
        <ul className="space-y-3">
          {records.map((record) => (
            <FundingRecordCard key={record.id} record={record} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FundingRecordCard({ record }: { record: FundingRecord }) {
  const boundUpdate = updateFundingRecord.bind(null, record.id);
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);
  const [deleting, startDeleteTransition] = useTransition();
  const [uploading, startUploadTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Funding Source" required>
            <select name="funding_source" required defaultValue={record.funding_source} className={inputClass}>
              {!FUNDING_SOURCES.includes(record.funding_source as (typeof FUNDING_SOURCES)[number]) && (
                <option value={record.funding_source}>{record.funding_source} (legacy value)</option>
              )}
              {FUNDING_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Application Status">
            <div className="flex items-center gap-2 pt-1.5">
              <Badge tone={fundingStatusTone(record.application_status)}>
                {record.application_status}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {record.application_status === "Pending Manager Approval"
                ? "Awaiting a manager's decision in the Funding Approval Queue."
                : "Set automatically from the amount requested, or by a manager's decision."}
            </p>
          </Field>
          <Field label="Amount Requested (£)">
            <input
              name="amount_requested"
              type="number"
              step="0.01"
              min="0"
              defaultValue={record.amount_requested ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Amount Approved (£)">
            <input
              name="amount_approved"
              type="number"
              step="0.01"
              min="0"
              defaultValue={record.amount_approved ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Amount Received (£)">
            <input
              name="amount_received"
              type="number"
              step="0.01"
              min="0"
              defaultValue={record.amount_received ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Funding Purpose">
            <input
              name="funding_purpose"
              defaultValue={record.funding_purpose ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Application Date">
            <input
              name="application_date"
              type="date"
              defaultValue={record.application_date ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Decision Date">
            <input
              name="decision_date"
              type="date"
              defaultValue={record.decision_date ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              name="notes"
              rows={2}
              defaultValue={record.notes ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm("Delete this funding record?")) {
                startDeleteTransition(() => deleteFundingRecord(record.id));
              }
            }}
            className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            Delete
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>

      {record.approved_by && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            {record.application_status === "Declined" ? "Declined" : "Approved"} by{" "}
            <span className="font-medium text-slate-800">{record.approved_by}</span>
            {record.approved_at && ` on ${new Date(record.approved_at).toLocaleDateString("en-GB")}`}
          </p>
          {record.manager_notes && <p className="mt-1">{record.manager_notes}</p>}
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        {record.file_path && record.file_name ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-700">{record.file_name}</span>
            <button
              type="button"
              onClick={async () => {
                const url = await getFundingDocumentUrl(record.file_path!);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="font-medium text-indigo-600 hover:underline"
            >
              View
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setUploadError(null);
              const formData = new FormData(e.currentTarget);
              startUploadTransition(async () => {
                try {
                  await uploadFundingDocument(record.id, formData);
                } catch (err) {
                  setUploadError(err instanceof Error ? err.message : "Upload failed.");
                }
              });
            }}
            className="flex items-center gap-3"
          >
            <input
              type="file"
              name="file"
              required
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload receipt"}
            </button>
            {uploadError && <span className="text-sm text-red-600">{uploadError}</span>}
          </form>
        )}
      </div>
    </li>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
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
