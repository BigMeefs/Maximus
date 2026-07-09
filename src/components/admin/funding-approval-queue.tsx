"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { FundingApprovalRow } from "@/lib/data/funding-approvals";
import {
  approveFundingRequest,
  rejectFundingRequest,
  type FundingFormState,
} from "@/lib/actions/funding";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const initialState: FundingFormState = {};

export default function FundingApprovalQueue({ rows }: { rows: FundingApprovalRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        No funding requests are awaiting manager approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <FundingApprovalCard key={row.record.id} row={row} />
      ))}
    </div>
  );
}

function FundingApprovalCard({ row }: { row: FundingApprovalRow }) {
  const [managerName, setManagerName] = useState("");
  const boundApprove = approveFundingRequest.bind(null, row.record.id, managerName);
  const boundReject = rejectFundingRequest.bind(null, row.record.id, managerName);
  const [approveState, approveAction, approving] = useActionState(boundApprove, initialState);
  const [rejectState, rejectAction, rejecting] = useActionState(boundReject, initialState);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {row.advisorId ? (
            <Link
              href={`/advisors/${row.advisorId}/participants/${row.participantId}?tab=funding`}
              className="font-medium text-slate-900 hover:text-indigo-600"
            >
              {row.participantName}
            </Link>
          ) : (
            <p className="font-medium text-slate-900">{row.participantName}</p>
          )}
          <p className="text-xs text-slate-500">
            {row.advisorName} · {row.officeName}
          </p>
        </div>
        <p className="text-lg font-semibold text-slate-900">
          {currency.format(row.record.amount_requested ?? 0)}
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Info label="Funding Source">{row.record.funding_source}</Info>
        <Info label="Purpose">{row.record.funding_purpose || "—"}</Info>
        <Info label="Requested">
          {row.record.application_date
            ? new Date(row.record.application_date).toLocaleDateString("en-GB")
            : "—"}
        </Info>
        {row.record.notes && (
          <Info label="Advisor Notes" className="col-span-2 sm:col-span-3">
            {row.record.notes}
          </Info>
        )}
      </dl>

      <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Your name (approving manager)</label>
          <input
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="e.g. Kyle Meadows"
            className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form action={approveAction} className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Approval notes (optional)</label>
            <textarea name="manager_notes" rows={2} className={inputClass} />
            <button
              type="submit"
              disabled={approving || !managerName.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {approving ? "Approving..." : "Approve"}
            </button>
            {approveState.error && <p className="text-sm text-red-600">{approveState.error}</p>}
          </form>

          <form action={rejectAction} className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Rejection notes (optional)</label>
            <textarea name="manager_notes" rows={2} className={inputClass} />
            <button
              type="submit"
              disabled={rejecting || !managerName.trim()}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </button>
            {rejectState.error && <p className="text-sm text-red-600">{rejectState.error}</p>}
          </form>
        </div>

        {!managerName.trim() && (
          <p className="text-xs text-slate-500">Enter your name above to enable approve/reject.</p>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

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
