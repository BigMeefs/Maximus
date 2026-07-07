"use client";

import { useTransition } from "react";
import clsx from "clsx";
import type { RagStatus } from "@/types/database";
import { updateRagStatus } from "@/lib/actions/participant-attributes";

const RAG_OPTIONS: { value: RagStatus; label: string }[] = [
  { value: "Green", label: "🟢 Green" },
  { value: "Amber", label: "🟡 Amber" },
  { value: "Red", label: "🔴 Red" },
];

export default function RagSelector({
  participantId,
  status,
  note,
  suggested,
}: {
  participantId: string;
  status: RagStatus;
  note: string | null;
  suggested: RagStatus;
}) {
  const [pending, startTransition] = useTransition();
  const boundAction = updateRagStatus.bind(null, participantId);

  return (
    <form
      action={(formData) => startTransition(() => boundAction(formData))}
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        {RAG_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={clsx(
              "cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              status === option.value
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name="rag_status"
              value={option.value}
              defaultChecked={status === option.value}
              disabled={pending}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
        {suggested !== status && (
          <span className="text-xs text-slate-500">
            Suggested: {suggested === "Green" ? "🟢" : suggested === "Amber" ? "🟡" : "🔴"} {suggested}
          </span>
        )}
      </div>
      <input
        type="text"
        name="rag_note"
        placeholder="Optional note..."
        defaultValue={note ?? ""}
        onBlur={(e) => e.currentTarget.form?.requestSubmit()}
        className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
      />
    </form>
  );
}
