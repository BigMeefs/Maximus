"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import type { Office } from "@/types/database";

export default function AdvisorSelector({
  advisors,
  offices,
}: {
  advisors: AdvisorWithOffice[];
  offices: Office[];
}) {
  const [search, setSearch] = useState("");
  const [officeId, setOfficeId] = useState("all");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return advisors.filter((a) => {
      const matchesOffice = officeId === "all" || a.office_id === officeId;
      const matchesSearch = !needle || a.full_name.toLowerCase().includes(needle);
      return matchesOffice && matchesSearch;
    });
  }, [advisors, officeId, search]);

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
          SE
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Self Employment Caseload Manager
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select an advisor to open their workspace
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search advisor name..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={officeId}
          onChange={(e) => setOfficeId(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All offices</option>
          {offices.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {advisors.length === 0
            ? "No advisors yet — add one from the Administration panel."
            : "No advisors match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((advisor) => (
            <Link
              key={advisor.id}
              href={`/advisors/${advisor.id}/dashboard`}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50"
            >
              <span className="text-sm font-semibold text-slate-800">
                {advisor.full_name}
              </span>
              <span className="text-xs text-slate-500">{advisor.office_name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
