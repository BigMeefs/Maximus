import { getAllMplTargets, getMplForMonth, monthKeyOf } from "@/lib/data/mpl";
import { getAdvisorMplPerformance } from "@/lib/data/advisor-mpl-performance";
import MplSettingsForm from "@/components/admin/mpl-settings-form";
import Badge from "@/components/badge";

function pctTone(pct: number | null): "slate" | "green" | "amber" | "red" {
  if (pct === null) return "slate";
  if (pct >= 100) return "green";
  if (pct >= 70) return "amber";
  return "red";
}

function PctBadge({ pct }: { pct: number | null }) {
  return <Badge tone={pctTone(pct)}>{pct === null ? "—" : `${pct}%`}</Badge>;
}

export default async function AdminPerformancePage() {
  const targets = await getAllMplTargets();
  const currentMpl = getMplForMonth(monthKeyOf(new Date()), targets);
  const { rows } = await getAdvisorMplPerformance();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Performance Targets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set the monthly Minimum Performance Level (MPL) for Trading Starts and Outcomes, and see how
          each advisor is tracking against it.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>
            Current Trading Starts MPL:{" "}
            <span className="font-semibold text-slate-900">{currentMpl ? currentMpl.tradingStartsMpl : "Not set"}</span>
          </span>
          <span>
            Current Outcomes MPL:{" "}
            <span className="font-semibold text-slate-900">{currentMpl ? currentMpl.outcomesMpl : "Not set"}</span>
          </span>
        </div>
        <MplSettingsForm
          tradingStartsMpl={currentMpl?.tradingStartsMpl ?? null}
          outcomesMpl={currentMpl?.outcomesMpl ?? null}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Advisor Performance</h2>
          <p className="text-xs text-slate-500">
            Percentage Achieved = actual ÷ MPL × 100, not capped at 100% — an advisor exceeding target
            shows over 100%. Rolling figures use the MPL that applied to each individual month, not
            today&apos;s target retroactively; a month before any MPL existed is excluded from that
            month&apos;s rolling calculation.
          </p>
        </div>
        {!currentMpl ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No MPL has been set yet — set one above to see Percentage Achieved figures.
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
            No active advisors found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Advisor</th>
                  <th className="px-4 py-3">Trading Starts</th>
                  <th className="px-4 py-3">TS % Achieved</th>
                  <th className="px-4 py-3">Outcomes</th>
                  <th className="px-4 py-3">Outcomes % Achieved</th>
                  <th className="px-4 py-3">TS 3M %</th>
                  <th className="px-4 py-3">Outcomes 3M %</th>
                  <th className="px-4 py-3">TS 6M %</th>
                  <th className="px-4 py-3">Outcomes 6M %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.advisorId}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.advisorName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.tradingStartsCurrent}</td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.tradingStartsCurrentPct} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.outcomesCurrent}</td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.outcomesCurrentPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.tradingStarts3MPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.outcomes3MPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.tradingStarts6MPct} />
                    </td>
                    <td className="px-4 py-3">
                      <PctBadge pct={row.outcomes6MPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
