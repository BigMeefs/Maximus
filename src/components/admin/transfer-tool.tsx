"use client";

import { useActionState, useMemo, useState } from "react";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import { transferParticipants, type TransferFormState } from "@/lib/actions/transfer";
import Button from "@/components/ui/button";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";

type ParticipantRow = {
  id: string;
  ptp_name: string;
  iconi_id: string | null;
  email: string | null;
  business_name: string;
  advisor_id: string;
};

const initialState: TransferFormState = {};

export default function TransferTool({
  participants,
  advisors,
}: {
  participants: ParticipantRow[];
  advisors: AdvisorWithOffice[];
}) {
  const [state, formAction, pending] = useActionState(transferParticipants, initialState);
  const [search, setSearch] = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Clear the selection whenever a transfer completes (success or error),
  // following React's "adjust state during render" pattern instead of an
  // effect, since this is a response to a value changing, not a sync with
  // an external system.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    setSelected(new Set());
  }

  const advisorNameById = useMemo(
    () => new Map(advisors.map((a) => [a.id, a.full_name])),
    [advisors],
  );

  const filtered = participants.filter((p) => {
    const matchesAdvisor = advisorFilter === "all" || p.advisor_id === advisorFilter;
    const needle = search.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      p.ptp_name.toLowerCase().includes(needle) ||
      p.business_name.toLowerCase().includes(needle) ||
      (p.iconi_id ?? "").toLowerCase().includes(needle) ||
      (p.email ?? "").toLowerCase().includes(needle) ||
      (advisorNameById.get(p.advisor_id) ?? "").toLowerCase().includes(needle);
    return matchesAdvisor && matchesSearch;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((p) => next.delete(p.id));
      } else {
        filtered.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="participant_ids" value={id} />
      ))}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, Iconi ID, email, business or advisor..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={advisorFilter}
          onChange={(e) => setAdvisorFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">Any current advisor</option>
          {advisors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </div>

      <Card padding="none" className="max-h-[24rem] overflow-auto">
        <Table>
          <THead className="sticky top-0">
            <tr>
              <Th>
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </Th>
              <Th>PTP Name</Th>
              <Th>Iconi ID</Th>
              <Th>Business</Th>
              <Th>Current advisor</Th>
            </tr>
          </THead>
          <TBody>
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{p.ptp_name}</td>
                <td className="px-4 py-3 text-slate-600">{p.iconi_id || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{p.business_name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {advisorNameById.get(p.advisor_id) ?? "Unknown"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No participants match.
                </td>
              </tr>
            )}
          </TBody>
        </Table>
      </Card>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Transfer {selected.size} selected participant{selected.size === 1 ? "" : "s"} to
          </label>
          <select
            name="to_advisor_id"
            required
            defaultValue=""
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="" disabled>
              Select advisor
            </option>
            {advisors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name} ({a.office_name})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
          <input
            name="notes"
            placeholder="e.g. Advisor on long-term leave"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending ? "Transferring..." : "Transfer"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
    </form>
  );
}
