"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const FILTERS = [
  { value: "all", label: "All participants" },
  { value: "expiring", label: "Expiring soon" },
  { value: "missing-plan", label: "Missing business plan" },
];

export default function ParticipantFilters({
  defaultQuery,
  defaultFilter,
}: {
  defaultQuery: string;
  defaultFilter: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/participants?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        defaultValue={defaultQuery}
        placeholder="Search by name or business..."
        onChange={(e) => updateParam("q", e.target.value)}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <select
        defaultValue={defaultFilter}
        onChange={(e) => updateParam("filter", e.target.value)}
        className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {FILTERS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
    </div>
  );
}
