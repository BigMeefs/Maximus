"use client";

import { useState } from "react";
import clsx from "clsx";
import type { JourneyMilestone } from "@/lib/journey-timeline";
import Badge from "@/components/badge";

export default function JourneyTimeline({ milestones }: { milestones: JourneyMilestone[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(
    milestones.find((m) => m.status === "current")?.id ?? null,
  );

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Participant Journey</h3>
      <p className="mt-1 text-xs text-slate-500">
        Click a milestone to see the notes, dates and evidence behind it.
      </p>

      <ol className="mt-4">
        {milestones.map((milestone, index) => {
          const isLast = index === milestones.length - 1;
          const expanded = expandedId === milestone.id;
          return (
            <li key={milestone.id}>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <MilestoneDot milestone={milestone} />
                  {!isLast && (
                    <div
                      className={clsx(
                        "w-0.5 flex-1",
                        milestone.status === "completed" ? "bg-indigo-600" : "bg-slate-200",
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 pb-5">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : milestone.id)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span>
                      <span
                        className={clsx(
                          "text-sm font-semibold",
                          milestone.status === "upcoming" ? "text-slate-400" : "text-slate-900",
                        )}
                      >
                        {milestone.label}
                      </span>
                      {milestone.status === "current" && (
                        <Badge tone="indigo" className="ml-2">
                          Current
                        </Badge>
                      )}
                      {milestone.notApplicable && (
                        <Badge tone="slate" className="ml-2">
                          Not required
                        </Badge>
                      )}
                      {milestone.negative && (
                        <Badge tone="red" className="ml-2">
                          Not achieved
                        </Badge>
                      )}
                    </span>
                    <span aria-hidden className="text-slate-400">
                      {expanded ? "▲" : "▼"}
                    </span>
                  </button>
                  <p
                    className={clsx(
                      "mt-0.5 text-xs",
                      milestone.status === "upcoming" ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    {milestone.summary}
                  </p>

                  {expanded && (
                    <dl className="mt-3 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      {milestone.detail.map((item) => (
                        <div key={item.label} className="flex flex-wrap gap-x-2 text-xs">
                          <dt className="font-medium text-slate-600">{item.label}:</dt>
                          <dd className="text-slate-800">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function MilestoneDot({ milestone }: { milestone: JourneyMilestone }) {
  if (milestone.status === "completed") {
    if (milestone.negative) {
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          ✕
        </div>
      );
    }
    if (milestone.notApplicable) {
      return (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white">
          –
        </div>
      );
    }
    return (
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
        ✓
      </div>
    );
  }
  if (milestone.status === "current") {
    return (
      <div className="h-6 w-6 shrink-0 rounded-full border-2 border-indigo-600 bg-white" />
    );
  }
  return <div className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-300 bg-white" />;
}
