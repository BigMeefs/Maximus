"use client";

import { useState, useTransition } from "react";
import type { ImportFieldMapping } from "@/types/database";
import { IMPORTABLE_FIELDS } from "@/lib/data-sync/field-mapping";
import { deleteFieldMapping } from "@/lib/actions/data-sync";

const LABEL_BY_FIELD = new Map<string, string>(IMPORTABLE_FIELDS.map((f) => [f.field, f.label]));

export default function FieldMappingList({ mappings }: { mappings: ImportFieldMapping[] }) {
  const [rows, setRows] = useState(mappings);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteFieldMapping(id));
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No saved mappings yet — mappings are remembered automatically the first time you map a
        spreadsheet column during an import.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Spreadsheet column</th>
            <th className="px-4 py-3">CRM field</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((mapping) => (
            <tr key={mapping.id}>
              <td className="px-4 py-3 text-slate-900">{mapping.source_column}</td>
              <td className="px-4 py-3 text-slate-600">
                {LABEL_BY_FIELD.get(mapping.target_field) ?? mapping.target_field}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(mapping.id)}
                  className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  Forget
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
