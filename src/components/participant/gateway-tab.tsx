"use client";

import { useTransition } from "react";
import clsx from "clsx";
import type { ChecklistEntry } from "@/lib/business-rules";
import type { GatewayChecklistItemName } from "@/types/database";
import { toggleGatewayChecklistItem } from "@/lib/actions/gateway";

export default function GatewayTab({
  participantId,
  entries,
  percent,
}: {
  participantId: string;
  entries: ChecklistEntry[];
  percent: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <h3 className="font-semibold text-slate-900">Gateway Readiness</h3>
          <span className="font-semibold text-slate-900">{percent}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              percent >= 90 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-red-500",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {entries.map((entry) => (
          <li
            key={entry.label}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={entry.complete}
                disabled={entry.source === "auto" || pending}
                onChange={(e) =>
                  startTransition(() =>
                    toggleGatewayChecklistItem(
                      participantId,
                      entry.label as GatewayChecklistItemName,
                      e.target.checked,
                    ),
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-70"
              />
              <span className="text-sm text-slate-800">{entry.label}</span>
            </div>
            <span
              className={clsx(
                "text-xs font-medium",
                entry.source === "auto" ? "text-slate-400" : "text-slate-300",
              )}
            >
              {entry.source === "auto" ? "Auto" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
