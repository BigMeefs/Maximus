"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { NOTIFICATION_STATUSES, NOTIFICATION_TYPES, type NotificationType, type NotificationStatus } from "@/types/database";
import Button from "@/components/ui/button";

type OfficeOption = { id: string; name: string };
type AdvisorOption = { id: string; full_name: string; office_id: string };

const TYPE_LABEL: Record<NotificationType, string> = {
  trading_start_eligible_gse: "GSE eligibility",
  trading_start_eligible_ngse: "NGSE eligibility",
  trading_start_eligible_claim_closed: "Claim Closed eligibility",
  income_submitted: "Income submitted",
  funding_approval_required: "Funding approval required",
  funding_approved: "Funding approved",
  funding_declined: "Funding declined",
  transferred_to_iwt: "Transferred to IWT",
  outcome_achieved: "Outcome achieved",
  upcoming_review: "Upcoming review",
  referral_submitted: "Referral submitted",
};

export default function NotificationHistoryFilters({
  offices,
  advisors,
}: {
  offices: OfficeOption[];
  advisors: AdvisorOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const officeId = searchParams.get("office") ?? "";
  const advisorId = searchParams.get("advisor") ?? "";
  const participant = searchParams.get("participant") ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const search = searchParams.get("search") ?? "";

  const visibleAdvisors = officeId ? advisors.filter((a) => a.office_id === officeId) : advisors;

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = Boolean(officeId || advisorId || participant || type || status || from || to || search);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-xs font-medium text-slate-600">
        Search
        <input
          type="search"
          defaultValue={search}
          onChange={(e) => updateParams({ search: e.target.value })}
          placeholder="Title, body, participant..."
          className="mt-1 block w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Participant
        <input
          type="search"
          defaultValue={participant}
          onChange={(e) => updateParams({ participant: e.target.value })}
          placeholder="Participant name"
          className="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Office
        <select
          value={officeId}
          onChange={(e) => updateParams({ office: e.target.value, advisor: "" })}
          className="mt-1 block w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        >
          <option value="">All offices</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Advisor
        <select
          value={advisorId}
          onChange={(e) => updateParams({ advisor: e.target.value })}
          className="mt-1 block w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        >
          <option value="">All advisors</option>
          {visibleAdvisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Type
        <select
          value={type}
          onChange={(e) => updateParams({ type: e.target.value })}
          className="mt-1 block w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        >
          <option value="">All types</option>
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Status
        <select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="mt-1 block w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        >
          <option value="">All statuses</option>
          {NOTIFICATION_STATUSES.map((s: NotificationStatus) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        From
        <input
          type="date"
          value={from}
          onChange={(e) => updateParams({ from: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        To
        <input
          type="date"
          value={to}
          onChange={(e) => updateParams({ to: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
        />
      </label>
      {hasFilters && (
        <Button type="button" variant="secondary" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
