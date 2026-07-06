"use client";

import { useTransition } from "react";
import { updateBusinessPlanStatus } from "@/lib/actions/business-plan";
import type { BusinessPlanStatus } from "@/types/database";

const STATUSES: BusinessPlanStatus[] = ["Not Started", "In Progress", "Complete"];

export default function BusinessPlanStatusSelect({
  participantId,
  status,
}: {
  participantId: string;
  status: BusinessPlanStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          updateBusinessPlanStatus(
            participantId,
            e.target.value as BusinessPlanStatus,
          );
        })
      }
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
