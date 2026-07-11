"use client";

import { useActionState, useState } from "react";
import type { BusinessPlan, Participant } from "@/types/database";
import { runAiAssistant, type AiAssistantState } from "@/lib/actions/ai-assistant";

const QUICK_ACTIONS = [
  {
    label: "Summarise meeting notes",
    instruction:
      "Turn the bullet points below into a professional, well-structured case note suitable for the participant's file.",
  },
  {
    label: "Draft a participant email",
    instruction:
      "Draft a friendly, clear email to the participant covering the point(s) below.",
  },
  {
    label: "Suggest SMART actions",
    instruction:
      "Suggest 3-5 SMART (Specific, Measurable, Achievable, Relevant, Time-bound) actions for this participant right now, given their context.",
  },
  {
    label: "Highlight missing Gateway Readiness evidence",
    instruction:
      "Review the participant's Gateway Readiness checklist gaps in the context below and explain what's missing and why it matters ahead of their Universal Credit Gateway appointment.",
  },
  {
    label: "Analyse business plan for weaknesses",
    instruction:
      "Based on the participant's context, identify likely weaknesses or gaps in their business plan and how to address them. Note if no business plan detail was provided.",
  },
  {
    label: "Suggest marketing ideas",
    instruction:
      "Suggest 3-5 practical, low-cost marketing ideas suited to this participant's business sector.",
  },
  {
    label: "Suggest funding opportunities",
    instruction:
      "Suggest UK funding, grant, or loan schemes that could realistically suit this participant's business sector and stage.",
  },
  {
    label: "Suggest next appointment questions",
    instruction:
      "Suggest 5 focused questions the advisor should ask at the participant's next appointment, given their current stage and gaps.",
  },
] as const;

const initialState: AiAssistantState = {};

export default function AiAssistantTab({
  participant,
  businessPlan,
  gatewayReadinessPercent,
  incompleteReadinessItems,
}: {
  participantId: string;
  participant: Participant;
  businessPlan: BusinessPlan | null;
  gatewayReadinessPercent: number;
  incompleteReadinessItems: string[];
}) {
  const [instruction, setInstruction] = useState<string>(QUICK_ACTIONS[0].instruction);

  const contextSummary = [
    `Name: ${participant.ptp_name}`,
    `Business: ${participant.business_name}${participant.business_sector ? ` (${participant.business_sector})` : ""}`,
    `Current stage: ${participant.business_stage}`,
    `RAG status: ${participant.rag_status}`,
    `Business plan status: ${businessPlan?.status ?? "Not Started"}`,
    `Gateway Readiness: ${gatewayReadinessPercent}%${incompleteReadinessItems.length ? ` — outstanding: ${incompleteReadinessItems.join(", ")}` : ""}`,
  ].join("\n");

  const boundAction = runAiAssistant.bind(null, contextSummary);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          AI Self Employment Assistant
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Tailored to {participant.ptp_name}&apos;s current stage and progress.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            type="button"
            onClick={() => setInstruction(qa.instruction)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              instruction === qa.instruction
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {qa.label}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            What do you want the assistant to do?
          </label>
          <textarea
            name="instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Notes, bullet points, or extra details (optional)
          </label>
          <textarea
            name="input"
            rows={5}
            placeholder="Paste meeting notes, bullet points, or context here..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? "Thinking..." : "Ask the assistant"}
        </button>
      </form>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.result && (
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
          {state.result}
        </div>
      )}
    </div>
  );
}
