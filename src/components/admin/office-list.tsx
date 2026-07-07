"use client";

import { useActionState, useState, useTransition } from "react";
import Badge from "@/components/badge";
import type { Office } from "@/types/database";
import {
  createOffice,
  renameOffice,
  setOfficeActive,
  type AdminFormState,
} from "@/lib/actions/admin";

const initialState: AdminFormState = {};

export default function OfficeList({
  offices,
  advisorCountByOffice,
}: {
  offices: Office[];
  advisorCountByOffice: Map<string, number>;
}) {
  const [createState, createAction, creating] = useActionState(createOffice, initialState);

  return (
    <div className="space-y-6">
      <form
        action={createAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">New office name</label>
          <input
            name="name"
            required
            placeholder="e.g. Leeds Office"
            className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {creating ? "Adding..." : "Add office"}
        </button>
        {createState.error && <span className="text-sm text-red-600">{createState.error}</span>}
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Office</th>
              <th className="px-4 py-3">Advisors</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offices.map((office) => (
              <OfficeRow
                key={office.id}
                office={office}
                advisorCount={advisorCountByOffice.get(office.id) ?? 0}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OfficeRow({ office, advisorCount }: { office: Office; advisorCount: number }) {
  const [editing, setEditing] = useState(false);
  const boundRename = renameOffice.bind(null, office.id);
  const [renameState, renameAction, renaming] = useActionState(boundRename, initialState);
  const [togglingActive, startToggleTransition] = useTransition();

  if (editing) {
    return (
      <tr>
        <td className="px-4 py-3" colSpan={4}>
          <form
            action={async (formData) => {
              await renameAction(formData);
              setEditing(false);
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <input
              name="name"
              required
              defaultValue={office.name}
              autoFocus
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              disabled={renaming}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            {renameState.error && <span className="text-sm text-red-600">{renameState.error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-medium text-slate-900">{office.name}</td>
      <td className="px-4 py-3 text-slate-600">{advisorCount}</td>
      <td className="px-4 py-3">
        <Badge tone={office.is_active ? "green" : "slate"}>
          {office.is_active ? "Active" : "Archived"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Rename
          </button>
          <button
            type="button"
            disabled={togglingActive}
            onClick={() =>
              startToggleTransition(() => setOfficeActive(office.id, !office.is_active))
            }
            className="text-sm font-medium text-slate-600 hover:text-red-600 disabled:opacity-60"
          >
            {office.is_active ? "Archive" : "Reactivate"}
          </button>
        </div>
      </td>
    </tr>
  );
}
