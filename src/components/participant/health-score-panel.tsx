"use client";

import { useTransition } from "react";
import clsx from "clsx";
import type { HealthScores } from "@/lib/business-rules";
import { updateHealthConfidence } from "@/lib/actions/participant-attributes";

const LABELS: { key: keyof HealthScores; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "finance", label: "Finance" },
  { key: "marketing", label: "Marketing" },
  { key: "trading", label: "Trading" },
  { key: "legal", label: "Legal" },
  { key: "digitalPresence", label: "Digital Presence" },
  { key: "confidence", label: "Confidence" },
];

function barTone(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

export default function HealthScorePanel({
  participantId,
  scores,
}: {
  participantId: string;
  scores: HealthScores;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">
        Business Health Score
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LABELS.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{label}</span>
              <span className="font-semibold text-slate-800">{scores[key]}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={clsx("h-full rounded-full transition-all", barTone(scores[key]))}
                style={{ width: `${scores[key]}%` }}
              />
            </div>
            {key === "confidence" && (
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                defaultValue={scores.confidence}
                disabled={pending}
                onPointerUp={(e) =>
                  startTransition(() =>
                    updateHealthConfidence(
                      participantId,
                      Number((e.target as HTMLInputElement).value),
                    ),
                  )
                }
                className="mt-2 w-full accent-indigo-600"
                aria-label="Adjust advisor confidence"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
