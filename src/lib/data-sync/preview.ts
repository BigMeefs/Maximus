import type { MappedParticipantRow, ValidationIssue } from "./types";

export type ImportRowOutcome = "create" | "update" | "duplicate" | "error";

export type ImportPreviewRow = {
  rowNumber: number;
  values: MappedParticipantRow["values"];
  issues: ValidationIssue[];
  outcome: ImportRowOutcome;
  matchedParticipantName?: string;
};
