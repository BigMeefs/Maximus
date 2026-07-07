import { isAdvisorName } from "@/lib/constants";
import type { MappedParticipantRow, ValidationIssue } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function matchKey(row: MappedParticipantRow): string | null {
  const v = row.values;
  if (v.external_participant_id) return `id:${v.external_participant_id.toLowerCase()}`;
  if (v.email) return `email:${v.email.toLowerCase()}`;
  if (v.phone) return `phone:${v.phone.toLowerCase()}`;
  if (v.national_insurance_number) return `ni:${v.national_insurance_number.toLowerCase()}`;
  if (v.ptp_name && v.date_of_birth) return `namedob:${v.ptp_name.trim().toLowerCase()}:${v.date_of_birth}`;
  return null;
}

// Validates a single row's required fields, date/email formats, and advisor
// name. "error" issues mean the row is skipped on import; "warning" issues
// are surfaced in the preview but don't block the row.
export function validateRow(row: MappedParticipantRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const v = row.values;
  const err = (field: ValidationIssue["field"], message: string) =>
    issues.push({ rowNumber: row.rowNumber, field, severity: "error", message });
  const warn = (field: ValidationIssue["field"], message: string) =>
    issues.push({ rowNumber: row.rowNumber, field, severity: "warning", message });

  if (!v.ptp_name?.trim()) err("ptp_name", "Participant name is required.");
  if (!v.business_name?.trim()) err("business_name", "Business name is required.");

  if (!v.scheme_start_date?.trim()) {
    err("scheme_start_date", "Scheme start date is required.");
  } else if (!DATE_RE.test(v.scheme_start_date)) {
    err("scheme_start_date", `Invalid scheme start date "${v.scheme_start_date}" — expected a recognisable date.`);
  }

  if (v.date_of_birth && !DATE_RE.test(v.date_of_birth)) {
    err("date_of_birth", `Invalid date of birth "${v.date_of_birth}".`);
  }
  if (v.gateway_target_date && !DATE_RE.test(v.gateway_target_date)) {
    err("gateway_target_date", `Invalid Gateway target date "${v.gateway_target_date}".`);
  }

  if (v.email && !EMAIL_RE.test(v.email)) {
    err("email", `Invalid email address "${v.email}".`);
  }

  if (v.advisor_name && !isAdvisorName(v.advisor_name)) {
    warn(
      "advisor_name",
      `Unrecognised advisor "${v.advisor_name}" — must be Kyle, Charles, Elliott or Aroosa. You'll be asked to choose an advisor for this row.`,
    );
  }

  if (!matchKey(row)) {
    warn(
      undefined,
      "No reliable matching identifier (Participant ID, Email, Phone, NI Number, or Name + Date of Birth) — this row will always create a new participant.",
    );
  }

  return issues;
}

// Flags rows within the same file that share a matching key with an earlier
// row, so advisors can spot accidental duplicate rows before import.
export function detectInFileDuplicates(rows: MappedParticipantRow[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    const key = matchKey(row);
    if (!key) continue;

    const firstRow = seen.get(key);
    if (firstRow !== undefined) {
      issues.push({
        rowNumber: row.rowNumber,
        severity: "warning",
        message: `Duplicate of row ${firstRow} within this file — both rows will be treated as the same participant.`,
      });
    } else {
      seen.set(key, row.rowNumber);
    }
  }

  return issues;
}
