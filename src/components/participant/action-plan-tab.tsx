"use client";

import { useActionState, useTransition } from "react";
import type { ActionPlanItem, ActionStatus } from "@/types/database";
import Badge, { statusTone } from "@/components/badge";
import {
  createActionPlanItem,
  deleteActionPlanItem,
  updateActionPlanStatus,
  type ActionPlanFormState,
} from "@/lib/actions/action-plan";

const STATUSES: ActionStatus[] = ["Not Started", "In Progress", "Complete"];
const initialState: ActionPlanFormState = {};

export default function ActionPlanTab({
  participantId,
  items,
}: {
  participantId: string;
  items: ActionPlanItem[];
}) {
  const boundAction = createActionPlanItem.bind(null, participantId);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );

  const ongoing = items.filter((i) => i.status !== "Complete");
  const history = items.filter((i) => i.status === "Complete");

  return (
    <div className="max-w-3xl space-y-8">
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Action description
            </label>
            <input
              name="description"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              placeholder="e.g. Submit quarterly accounts"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Target date
            </label>
            <input
              type="date"
              name="target_date"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notes
            </label>
            <input
              name="notes"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Adding..." : "Add action"}
          </button>
          {state.error && (
            <span className="text-sm text-red-600">{state.error}</span>
          )}
        </div>
      </form>

      <ActionList
        title="Ongoing actions"
        items={ongoing}
        participantId={participantId}
        emptyLabel="No ongoing actions."
      />
      <ActionList
        title="History"
        items={history}
        participantId={participantId}
        emptyLabel="No completed actions yet."
      />
    </div>
  );
}

function ActionList({
  title,
  items,
  participantId,
  emptyLabel,
}: {
  title: string;
  items: ActionPlanItem[];
  participantId: string;
  emptyLabel: string;
}) {
  const [deletingId, startDeleteTransition] = useTransition();
  const [updatingId, startUpdateTransition] = useTransition();

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {item.description}
                </p>
                <p className="text-xs text-slate-500">
                  {item.target_date &&
                    `Target: ${new Date(item.target_date).toLocaleDateString()}`}
                  {item.notes && ` · ${item.notes}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  defaultValue={item.status}
                  disabled={updatingId}
                  onChange={(e) =>
                    startUpdateTransition(() =>
                      updateActionPlanStatus(
                        participantId,
                        item.id,
                        e.target.value as ActionStatus,
                      ),
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                <button
                  type="button"
                  disabled={deletingId}
                  onClick={() =>
                    startDeleteTransition(() =>
                      deleteActionPlanItem(participantId, item.id),
                    )
                  }
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
