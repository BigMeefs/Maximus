"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type OfficeOption = { id: string; name: string };
type AdvisorOption = { id: string; full_name: string; office_id: string };

export default function ReportFilters({
  offices,
  advisors,
}: {
  offices: OfficeOption[];
  advisors: AdvisorOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const officeId = searchParams.get("office") ?? "";
  const advisorId = searchParams.get("advisor") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const visibleAdvisors = officeId ? advisors.filter((a) => a.office_id === officeId) : advisors;

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`/reports?${params.toString()}`);
    });
  }

  const hasFilters = Boolean(officeId || advisorId || from || to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-xs font-medium text-slate-600">
        Office
        <select
          value={officeId}
          onChange={(e) => updateParams({ office: e.target.value, advisor: "" })}
          className="mt-1 block w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
          className="mt-1 block w-44 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
        From
        <input
          type="date"
          value={from}
          onChange={(e) => updateParams({ from: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        To
        <input
          type="date"
          value={to}
          onChange={(e) => updateParams({ to: e.target.value })}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </label>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/reports")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
