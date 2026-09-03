"use client";

import { useTransition } from "react";
import clsx from "clsx";
import { BUSINESS_STAGES, type BusinessStage } from "@/types/database";
import { updateBusinessStage } from "@/lib/actions/participant-attributes";
import type { JourneyMilestone } from "@/lib/journey-timeline";
import JourneyTimeline from "@/components/participant/journey-timeline";
import Card from "@/components/ui/card";

export default function JourneyTab({
  participantId,
  currentStage,
  stageUpdatedAt,
  milestones,
}: {
  participantId: string;
  currentStage: BusinessStage;
  stageUpdatedAt: string;
  milestones: JourneyMilestone[];
}) {
  return (
    <div className="max-w-3xl space-y-8">
      <Card>
        <JourneyTimeline milestones={milestones} />
      </Card>

      <details className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900">
          Business Readiness Stage (internal tracking)
        </summary>
        <p className="mt-2 text-xs text-slate-500">
          A separate, more granular stage advisors set manually — feeds the Business Health Score
          and Next Best Action suggestions elsewhere in the CRM. The Participant Journey above is
          the primary view of where this participant stands.
        </p>
        <BusinessStageStepper
          participantId={participantId}
          currentStage={currentStage}
          stageUpdatedAt={stageUpdatedAt}
        />
      </details>
    </div>
  );
}

function BusinessStageStepper({
  participantId,
  currentStage,
  stageUpdatedAt,
}: {
  participantId: string;
  currentStage: BusinessStage;
  stageUpdatedAt: string;
}) {
  const [pending, startTransition] = useTransition();
  const currentIndex = BUSINESS_STAGES.indexOf(currentStage);

  return (
    <div className="mt-4">
      <p className="mb-3 text-sm text-slate-500">
        Currently at <span className="font-medium text-slate-800">{currentStage}</span>{" "}
        since {new Date(stageUpdatedAt).toLocaleDateString()}.
      </p>

      <ol className="space-y-1">
        {BUSINESS_STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={stage} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    isComplete && "border-indigo-600 bg-indigo-600 text-white",
                    isCurrent && "border-indigo-600 bg-white text-indigo-600",
                    !isComplete && !isCurrent && "border-slate-300 bg-white text-slate-400",
                  )}
                >
                  {isComplete ? "✓" : index + 1}
                </div>
                {index < BUSINESS_STAGES.length - 1 && (
                  <div
                    className={clsx(
                      "h-6 w-0.5",
                      isComplete ? "bg-indigo-600" : "bg-slate-200",
                    )}
                  />
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => updateBusinessStage(participantId, stage))
                }
                className={clsx(
                  "flex-1 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-60",
                  isCurrent
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                {stage}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-indigo-500">
                    (current — click another stage to move it)
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
