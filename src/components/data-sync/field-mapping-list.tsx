"use client";

import { useState, useTransition } from "react";
import type { ImportFieldMapping } from "@/types/database";
import { IMPORTABLE_FIELDS } from "@/lib/data-sync/field-mapping";
import { deleteFieldMapping } from "@/lib/actions/data-sync";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";

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
    <Card padding="none" className="overflow-hidden">
      <Table>
        <THead>
          <tr>
            <Th>Spreadsheet column</Th>
            <Th>CRM field</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
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
        </TBody>
      </Table>
    </Card>
  );
}
