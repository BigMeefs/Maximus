"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import Button from "@/components/ui/button";

type OfficeOption = { id: string; name: string };
type AdvisorOption = { id: string; full_name: string; office_id: string };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PerformanceFilters({
  offices,
  advisors,
  years,
}: {
  offices: OfficeOption[];
  advisors: AdvisorOption[];
  years: number[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const month = searchParams.get("month") ?? "";
  const year = searchParams.get("year") ?? "";
  const officeId = searchParams.get("office") ?? "";
  const advisorId = searchParams.get("advisor") ?? "";

  const visibleAdvisors = officeId ? advisors.filter((a) => a.office_id === officeId) : advisors;

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`/reports/performance-tracker?${params.toString()}`);
    });
  }

  const hasFilters = Boolean(month || year || officeId || advisorId);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="text-xs font-medium text-slate-600">
        Month
        <select
          value={month}
          onChange={(e) => updateParams({ month: e.target.value })}
          className="mt-1 block w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">All months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Year
        <select
          value={year}
          onChange={(e) => updateParams({ year: e.target.value })}
          className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
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
      {hasFilters && (
        <Button type="button" variant="secondary" onClick={() => router.push("/reports/performance-tracker")}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
