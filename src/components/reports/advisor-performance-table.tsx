"use client";

import { useMemo, useState } from "react";

export type AdvisorPerformanceRow = {
  advisorId: string;
  advisorName: string;
  officeLabel: string;
  tradingStarts: number;
  outcomesAchieved: number;
  conversionRate: number;
  currentCaseload: number;
  iwtCaseload: number;
};

type SortKey = Exclude<keyof AdvisorPerformanceRow, "advisorId">;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "advisorName", label: "Advisor" },
  { key: "officeLabel", label: "Office" },
  { key: "tradingStarts", label: "Trading Starts" },
  { key: "outcomesAchieved", label: "Outcomes" },
  { key: "conversionRate", label: "Conversion %" },
  { key: "currentCaseload", label: "Current Caseload" },
  { key: "iwtCaseload", label: "Current IWT Caseload" },
];

function toCsv(rows: AdvisorPerformanceRow[]): string {
  const header = COLUMNS.map((c) => c.label).join(",");
  const lines = rows.map((r) =>
    COLUMNS.map((c) => {
      const value = r[c.key];
      return typeof value === "string" && value.includes(",") ? `"${value}"` : String(value);
    }).join(","),
  );
  return [header, ...lines].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdvisorPerformanceTable({
  rows,
  exportFilename = "advisor-performance.csv",
}: {
  rows: AdvisorPerformanceRow[];
  exportFilename?: string;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("tradingStarts");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => r.advisorName.toLowerCase().includes(q) || r.officeLabel.toLowerCase().includes(q))
      : rows;
    return [...base].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search advisor or office..."
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="button"
          onClick={() => downloadCsv(exportFilename, toCsv(visibleRows))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-slate-500">No advisors match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="flex items-center gap-1 whitespace-nowrap hover:text-slate-900"
                    >
                      {c.label}
                      {sortKey === c.key && <span>{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.map((row, index) => (
                <tr key={row.advisorId}>
                  <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.advisorName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.officeLabel}</td>
                  <td className="px-4 py-3 text-slate-600">{row.tradingStarts}</td>
                  <td className="px-4 py-3 text-slate-600">{row.outcomesAchieved}</td>
                  <td className="px-4 py-3 text-slate-600">{row.conversionRate}%</td>
                  <td className="px-4 py-3 text-slate-600">{row.currentCaseload}</td>
                  <td className="px-4 py-3 text-slate-600">{row.iwtCaseload}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
