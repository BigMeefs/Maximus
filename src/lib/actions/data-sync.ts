"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { findMatch, type MatchCandidate } from "@/lib/data-sync/matching";
import { transformRows } from "@/lib/data-sync/transform";
import { detectInFileDuplicates, validateRow } from "@/lib/data-sync/validation";
import type {
  FieldMapping,
  ImportRow,
  MappedParticipantRow,
  ParticipantTargetField,
  ValidationIssue,
} from "@/lib/data-sync/types";
import type { ImportPreviewRow } from "@/lib/data-sync/preview";
import type { ImportBatch, ImportError, ImportFieldMapping, ImportStatus } from "@/types/database";

const CANDIDATE_COLUMNS =
  "id, external_participant_id, email, phone, national_insurance_number, ptp_name, date_of_birth";

const UPDATABLE_FIELDS: Exclude<ParticipantTargetField, "advisor_name">[] = [
  "ptp_name",
  "business_name",
  "scheme_start_date",
  "external_participant_id",
  "email",
  "phone",
  "date_of_birth",
  "national_insurance_number",
  "business_sector",
  "gateway_target_date",
  "website",
  "social_media_links",
  "previous_advisor",
];

function revalidateDataSync(advisorId: string) {
  revalidatePath(`/advisors/${advisorId}/data-sync`);
  revalidatePath(`/advisors/${advisorId}/participants`);
  revalidatePath(`/advisors/${advisorId}/dashboard`);
}

// Builds lowercased-full-name -> id and id -> full-name lookups — there's no
// hard-coded advisor list, so import rows are matched against whoever is
// currently in the Administration panel.
async function getAdvisorIndexes(): Promise<{
  byName: Map<string, string>;
  byId: Map<string, string>;
}> {
  const advisors = await listAdvisors();
  return {
    byName: new Map(advisors.map((a) => [a.full_name.trim().toLowerCase(), a.id])),
    byId: new Map(advisors.map((a) => [a.id, a.full_name])),
  };
}

// ---------------------------------------------------------------------------
// Saved field mapping — keyed by the spreadsheet column name so the same
// mapping is suggested next time a file with that header is uploaded.
// ---------------------------------------------------------------------------

export async function getSavedFieldMapping(): Promise<Record<string, ParticipantTargetField>> {
  const supabase = await createClient();
  const { data } = await supabase.from("import_field_mappings").select("source_column, target_field");

  const map: Record<string, ParticipantTargetField> = {};
  for (const row of data ?? []) {
    map[row.source_column] = row.target_field as ParticipantTargetField;
  }
  return map;
}

export async function saveFieldMapping(mapping: FieldMapping) {
  const rows = Object.entries(mapping)
    .filter((entry): entry is [ParticipantTargetField, string] => !!entry[1])
    .map(([targetField, sourceColumn]) => ({ source_column: sourceColumn, target_field: targetField }));

  if (rows.length === 0) return;

  const supabase = await createClient();
  await supabase.from("import_field_mappings").upsert(rows, { onConflict: "source_column" });
}

export async function getFieldMappings(): Promise<ImportFieldMapping[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_field_mappings")
    .select("*")
    .order("source_column", { ascending: true });
  return data ?? [];
}

export async function deleteFieldMapping(id: string) {
  const supabase = await createClient();
  await supabase.from("import_field_mappings").delete().eq("id", id);
}

// ---------------------------------------------------------------------------
// Import History
// ---------------------------------------------------------------------------

export async function getImportHistory(): Promise<ImportBatch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getImportBatch(batchId: string): Promise<ImportBatch | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
  return data ?? null;
}

export async function getImportBatchErrors(batchId: string): Promise<ImportError[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_errors")
    .select("*")
    .eq("import_batch_id", batchId)
    .order("row_number", { ascending: true });
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Sync Dashboard
// ---------------------------------------------------------------------------

export type SyncDashboardStats = {
  lastImportDate: string | null;
  totalParticipantsImported: number;
  newParticipantsAdded: number;
  participantsUpdated: number;
  importErrors: number;
  importsThisMonth: number;
  recentBatches: ImportBatch[];
};

export async function getSyncDashboardStats(): Promise<SyncDashboardStats> {
  const batches = await getImportHistory();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const totals = batches.reduce(
    (acc, b) => ({
      newParticipantsAdded: acc.newParticipantsAdded + b.created_count,
      participantsUpdated: acc.participantsUpdated + b.updated_count,
      importErrors: acc.importErrors + b.error_count,
      importsThisMonth: acc.importsThisMonth + (new Date(b.created_at) >= monthStart ? 1 : 0),
    }),
    { newParticipantsAdded: 0, participantsUpdated: 0, importErrors: 0, importsThisMonth: 0 },
  );

  return {
    lastImportDate: batches[0]?.created_at ?? null,
    totalParticipantsImported: totals.newParticipantsAdded + totals.participantsUpdated,
    ...totals,
    recentBatches: batches.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Preview — read-only. Shows what an import *would* do without writing
// anything, for the "Preview data" / "Validate" steps of the wizard.
// ---------------------------------------------------------------------------

export async function previewImport(rows: ImportRow[], mapping: FieldMapping): Promise<ImportPreviewRow[]> {
  const supabase = await createClient();
  const mappedRows = transformRows(rows, mapping);
  const { byName: advisorNameIndex } = await getAdvisorIndexes();
  const validAdvisorNames = new Set(advisorNameIndex.keys());

  const { data: existing } = await supabase.from("participants").select(CANDIDATE_COLUMNS);
  const candidates: MatchCandidate[] = existing ?? [];
  const nameById = new Map(candidates.map((c) => [c.id, c.ptp_name]));

  const duplicateIssuesByRow = new Map<number, ValidationIssue[]>();
  for (const issue of detectInFileDuplicates(mappedRows)) {
    const existingIssues = duplicateIssuesByRow.get(issue.rowNumber) ?? [];
    existingIssues.push(issue);
    duplicateIssuesByRow.set(issue.rowNumber, existingIssues);
  }

  const processed = new Set<string>();
  const preview: ImportPreviewRow[] = [];

  for (const row of mappedRows) {
    const issues = [
      ...validateRow(row, validAdvisorNames),
      ...(duplicateIssuesByRow.get(row.rowNumber) ?? []),
    ];

    if (issues.some((i) => i.severity === "error")) {
      preview.push({ rowNumber: row.rowNumber, values: row.values, issues, outcome: "error" });
      continue;
    }

    const outcome = findMatch(row, candidates);

    if (outcome.type === "match" && processed.has(outcome.participantId)) {
      preview.push({
        rowNumber: row.rowNumber,
        values: row.values,
        issues,
        outcome: "duplicate",
        matchedParticipantName: nameById.get(outcome.participantId),
      });
      continue;
    }

    if (outcome.type === "match") {
      processed.add(outcome.participantId);
      preview.push({
        rowNumber: row.rowNumber,
        values: row.values,
        issues,
        outcome: "update",
        matchedParticipantName: nameById.get(outcome.participantId),
      });
      continue;
    }

    preview.push({ rowNumber: row.rowNumber, values: row.values, issues, outcome: "create" });
  }

  return preview;
}

// ---------------------------------------------------------------------------
// Run Import — the write path. Re-derives matching/validation from scratch
// against current DB state rather than trusting an earlier preview call.
// ---------------------------------------------------------------------------

export type ImportRunResult = {
  batchId: string;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
  errorCount: number;
  status: ImportStatus;
};

function issuesToMessage(issues: ValidationIssue[]): string {
  return issues.map((i) => i.message).join(" ");
}

function resolveAdvisorId(
  rawName: string | null | undefined,
  advisorNameIndex: Map<string, string>,
): string | undefined {
  if (!rawName) return undefined;
  return advisorNameIndex.get(rawName.trim().toLowerCase());
}

function buildCreatePayload(
  values: MappedParticipantRow["values"],
  advisorNameIndex: Map<string, string>,
  fallbackAdvisorId: string,
) {
  const advisorId = resolveAdvisorId(values.advisor_name, advisorNameIndex) ?? fallbackAdvisorId;

  return {
    advisor_id: advisorId,
    ptp_name: values.ptp_name!,
    business_name: values.business_name!,
    scheme_start_date: values.scheme_start_date!,
    external_participant_id: values.external_participant_id ?? null,
    email: values.email ?? null,
    phone: values.phone ?? null,
    date_of_birth: values.date_of_birth ?? null,
    national_insurance_number: values.national_insurance_number ?? null,
    business_sector: values.business_sector ?? null,
    gateway_target_date: values.gateway_target_date ?? null,
    website: values.website ?? null,
    social_media_links: values.social_media_links ?? null,
    previous_advisor: values.previous_advisor ?? null,
  };
}

// Safe Import Rules: only ever includes fields the row actually supplied a
// value for, and only ever touches participants columns — funding, Gateway
// Readiness, evidence and business-plan data are untouched by construction
// since this function never references those tables.
function buildUpdatePayload(
  values: MappedParticipantRow["values"],
  advisorNameIndex: Map<string, string>,
) {
  const payload: Partial<Record<Exclude<ParticipantTargetField, "advisor_name">, string>> & {
    advisor_id?: string;
  } = {};

  for (const field of UPDATABLE_FIELDS) {
    const value = values[field];
    if (value !== null && value !== undefined) payload[field] = value;
  }

  const advisorId = resolveAdvisorId(values.advisor_name, advisorNameIndex);
  if (advisorId) {
    payload.advisor_id = advisorId;
  }

  return payload;
}

export async function runImport(
  runByAdvisorId: string,
  fallbackAdvisorId: string,
  fileName: string,
  rows: ImportRow[],
  mapping: FieldMapping,
): Promise<ImportRunResult> {
  const supabase = await createClient();
  const rawByRowNumber = new Map(rows.map((r) => [r.rowNumber, r.raw]));
  const mappedRows = transformRows(rows, mapping);
  const { byName: advisorNameIndex, byId: advisorIdIndex } = await getAdvisorIndexes();
  const validAdvisorNames = new Set(advisorNameIndex.keys());

  const { data: existing } = await supabase.from("participants").select(CANDIDATE_COLUMNS);
  const candidates: MatchCandidate[] = existing ?? [];

  const processedParticipantIds = new Set<string>();
  let createdCount = 0;
  let updatedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const errorRecords: { row_number: number; error_message: string; row_data: Record<string, unknown> }[] = [];

  for (const row of mappedRows) {
    const blocking = validateRow(row, validAdvisorNames).filter((i) => i.severity === "error");

    if (blocking.length > 0) {
      errorCount++;
      errorRecords.push({
        row_number: row.rowNumber,
        error_message: issuesToMessage(blocking),
        row_data: rawByRowNumber.get(row.rowNumber) ?? {},
      });
      continue;
    }

    const outcome = findMatch(row, candidates);

    if (outcome.type === "match" && processedParticipantIds.has(outcome.participantId)) {
      duplicateCount++;
      continue;
    }

    if (outcome.type === "match") {
      const payload = buildUpdatePayload(row.values, advisorNameIndex);
      if (Object.keys(payload).length > 0) {
        await supabase.from("participants").update(payload).eq("id", outcome.participantId);
      }
      processedParticipantIds.add(outcome.participantId);
      updatedCount++;
      continue;
    }

    const { data: created, error } = await supabase
      .from("participants")
      .insert(buildCreatePayload(row.values, advisorNameIndex, fallbackAdvisorId))
      .select(CANDIDATE_COLUMNS)
      .single();

    if (error || !created) {
      errorCount++;
      errorRecords.push({
        row_number: row.rowNumber,
        error_message: error?.message ?? "Failed to create participant.",
        row_data: rawByRowNumber.get(row.rowNumber) ?? {},
      });
      continue;
    }

    await supabase.from("business_plans").insert({ participant_id: created.id, status: "Not Started" });

    candidates.push(created);
    processedParticipantIds.add(created.id);
    createdCount++;
  }

  const status: ImportStatus =
    errorCount === 0 ? "Success" : createdCount + updatedCount === 0 ? "Failed" : "Partial";

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      imported_by: advisorIdIndex.get(runByAdvisorId) ?? "Unknown advisor",
      file_name: fileName,
      source: "file",
      row_count: rows.length,
      created_count: createdCount,
      updated_count: updatedCount,
      duplicate_count: duplicateCount,
      error_count: errorCount,
      status,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(batchError?.message ?? "Failed to record the import batch.");
  }

  if (errorRecords.length > 0) {
    await supabase
      .from("import_errors")
      .insert(errorRecords.map((record) => ({ ...record, import_batch_id: batch.id })));
  }

  revalidateDataSync(runByAdvisorId);

  return {
    batchId: batch.id,
    rowCount: rows.length,
    createdCount,
    updatedCount,
    duplicateCount,
    errorCount,
    status,
  };
}
