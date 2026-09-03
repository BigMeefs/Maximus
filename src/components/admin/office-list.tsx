"use client";

import { useActionState, useState, useTransition } from "react";
import Badge from "@/components/badge";
import Button from "@/components/ui/button";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";
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
        <Button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add office"}
        </Button>
        {createState.error && <span className="text-sm text-red-600">{createState.error}</span>}
      </form>

      <Card padding="none" className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <Th>Office</Th>
              <Th>Advisors</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {offices.map((office) => (
              <OfficeRow
                key={office.id}
                office={office}
                advisorCount={advisorCountByOffice.get(office.id) ?? 0}
              />
            ))}
          </TBody>
        </Table>
      </Card>
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
            <Button type="submit" size="sm" disabled={renaming}>
              Save
            </Button>
            <Button type="button" variant="secondary" size="compact" onClick={() => setEditing(false)}>
              Cancel
            </Button>
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
