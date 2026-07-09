"use client";

import { useTransition } from "react";
import Link from "next/link";
import Badge from "@/components/badge";
import type { IncomeSubmissionRow } from "@/lib/data/notifications";
import { getDeclarationFileUrl, markSubmissionReviewed } from "@/lib/actions/portal";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default function SubmissionList({
  rows,
  reviewedByName,
}: {
  rows: IncomeSubmissionRow[];
  reviewedByName: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        No submissions match these filters.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <SubmissionCard key={row.entry.id} row={row} reviewedByName={reviewedByName} />
      ))}
    </div>
  );
}

function SubmissionCard({ row, reviewedByName }: { row: IncomeSubmissionRow; reviewedByName: string }) {
  const [reviewing, startReviewTransition] = useTransition();
  const [opening, startOpenTransition] = useTransition();

  const { entry } = row;
  const openHref = `/advisors/${row.advisorId || ""}/participants/${row.participantId}?tab=income-tracker`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{row.participantName}</p>
          <p className="text-xs text-slate-500">
            {row.participantEmail ?? "No email on file"} · {row.advisorName} · {row.officeName}
          </p>
        </div>
        {entry.reviewed ? (
          <Badge tone="green">
            Reviewed{entry.reviewed_by ? ` by ${entry.reviewed_by}` : ""}
          </Badge>
        ) : (
          <Badge tone="amber">Unreviewed</Badge>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Info label="Submitted">{new Date(entry.entry_date).toLocaleDateString("en-GB")}</Info>
        <Info label="Net Profit">{currency.format(row.netProfit)}</Info>
        <Info label="Mileage Deduction">{currency.format(Number(entry.mileage_cost))}</Info>
        <Info label="Status">
          {entry.reviewed && entry.reviewed_at
            ? `Reviewed ${new Date(entry.reviewed_at).toLocaleDateString("en-GB")}`
            : "Awaiting advisor review"}
        </Info>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!entry.reviewed && (
          <button
            type="button"
            disabled={reviewing}
            onClick={() =>
              startReviewTransition(async () => {
                await markSubmissionReviewed(entry.id, reviewedByName);
              })
            }
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {reviewing ? "Marking..." : "✓ Mark as Reviewed"}
          </button>
        )}
        <Link
          href={openHref}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Open submission
        </Link>
        {entry.declaration_file_path && (
          <button
            type="button"
            disabled={opening}
            onClick={() =>
              startOpenTransition(async () => {
                const url = await getDeclarationFileUrl(entry.declaration_file_path!);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              })
            }
            className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-60"
          >
            View declaration
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}
