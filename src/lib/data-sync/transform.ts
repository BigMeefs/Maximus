import { normalizeDateValue } from "./dates";
import type { FieldMapping, ImportRow, MappedParticipantRow, ParticipantTargetField } from "./types";

const DATE_FIELDS: ParticipantTargetField[] = ["scheme_start_date", "gateway_target_date", "date_of_birth"];

// Applies a field mapping to raw parsed rows, trimming text and normalizing
// dates. Purely a shape transform — no validation or matching happens here.
export function transformRows(rows: ImportRow[], mapping: FieldMapping): MappedParticipantRow[] {
  const entries = Object.entries(mapping) as [ParticipantTargetField, string][];

  return rows.map((row) => {
    const values: MappedParticipantRow["values"] = {};

    for (const [field, sourceColumn] of entries) {
      if (!sourceColumn) continue;
      const raw = row.raw[sourceColumn];

      if (raw === undefined || raw === null || String(raw).trim() === "") {
        values[field] = null;
        continue;
      }

      values[field] = DATE_FIELDS.includes(field)
        ? normalizeDateValue(raw)
        : String(raw).trim();
    }

    return { rowNumber: row.rowNumber, values };
  });
}
