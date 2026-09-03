"use client";

import { useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { parseImportFile, type ParsedSheet } from "@/lib/data-sync/parse";
import { IMPORTABLE_FIELDS, suggestFieldMapping } from "@/lib/data-sync/field-mapping";
import type { FieldMapping, ParticipantTargetField } from "@/lib/data-sync/types";
import type { ImportPreviewRow, ImportRowOutcome } from "@/lib/data-sync/preview";
import { previewImport, runImport, saveFieldMapping, type ImportRunResult } from "@/lib/actions/data-sync";
import type { AdvisorWithOffice } from "@/lib/data/advisor";
import Button from "@/components/ui/button";
import { Table, THead, Th, TBody } from "@/components/ui/table";
import Card from "@/components/ui/card";

type Step = "upload" | "map" | "preview" | "summary";

const OUTCOME_LABEL: Record<ImportRowOutcome, string> = {
  create: "New participant",
  update: "Update existing",
  duplicate: "Duplicate row",
  error: "Blocked",
};

const OUTCOME_TONE: Record<ImportRowOutcome, string> = {
  create: "bg-indigo-100 text-indigo-700",
  update: "bg-amber-100 text-amber-700",
  duplicate: "bg-slate-200 text-slate-700",
  error: "bg-red-100 text-red-700",
};

const PREVIEW_ROW_LIMIT = 200;

export default function ImportWizard({
  advisorId,
  advisors,
  savedMapping,
}: {
  advisorId: string;
  advisors: AdvisorWithOffice[];
  savedMapping: Record<string, ParticipantTargetField>;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [rememberMapping, setRememberMapping] = useState(true);
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [fallbackAdvisorId, setFallbackAdvisorId] = useState(advisorId);
  const [result, setResult] = useState<ImportRunResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.rows.length === 0) {
        setError("No data rows were found in that file.");
        return;
      }

      const initialMapping: FieldMapping = {};
      const usedColumns = new Set<string>();
      for (const col of parsed.columns) {
        const saved = savedMapping[col];
        if (saved) {
          initialMapping[saved] = col;
          usedColumns.add(col);
        }
      }
      const suggested = suggestFieldMapping(parsed.columns.filter((c) => !usedColumns.has(c)));
      for (const [field, col] of Object.entries(suggested) as [ParticipantTargetField, string][]) {
        if (!initialMapping[field]) initialMapping[field] = col;
      }

      setSheet(parsed);
      setFileName(file.name);
      setMapping(initialMapping);
      setPreview(null);
      setResult(null);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    }
  }

  function handleMappingChange(field: ParticipantTargetField, column: string) {
    setMapping((prev) => ({ ...prev, [field]: column || undefined }));
  }

  const requiredFieldsMapped = IMPORTABLE_FIELDS.filter((f) => f.required).every((f) => mapping[f.field]);

  function handlePreview() {
    if (!sheet) return;
    setError(null);
    startTransition(async () => {
      try {
        const rows = await previewImport(sheet.rows, mapping);
        setPreview(rows);
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to preview the import.");
      }
    });
  }

  function handleConfirmImport() {
    if (!sheet) return;
    setError(null);
    startTransition(async () => {
      try {
        if (rememberMapping) {
          await saveFieldMapping(mapping);
        }
        const res = await runImport(advisorId, fallbackAdvisorId, fileName, sheet.rows, mapping);
        setResult(res);
        setStep("summary");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  function startOver() {
    setStep("upload");
    setSheet(null);
    setFileName("");
    setMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const counts = preview?.reduce(
    (acc, row) => ({ ...acc, [row.outcome]: acc[row.outcome] + 1 }),
    { create: 0, update: 0, duplicate: 0, error: 0 } as Record<ImportRowOutcome, number>,
  );

  return (
    <div className="space-y-6">
      <WizardSteps step={step} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={clsx(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
              dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50",
            )}
          >
            <p className="text-sm font-medium text-slate-700">
              Drag and drop a .xlsx or .csv file exported from Power BI, or
            </p>
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              Choose a file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Connect to Power BI</p>
              <p className="text-xs text-slate-500">
                Direct API integration — imports participant data automatically without a file export.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-400"
            >
              Coming soon
            </button>
          </div>
        </div>
      )}

      {step === "map" && sheet && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {sheet.rows.length} rows found in <span className="font-medium">{fileName}</span>. Match each
            spreadsheet column to a CRM field. Fields marked{" "}
            <span className="font-medium text-red-600">*</span> are required.
          </p>

          <Card padding="none" className="overflow-hidden">
            <Table>
              <THead>
                <tr>
                  <Th>CRM field</Th>
                  <Th>Spreadsheet column</Th>
                </tr>
              </THead>
              <TBody>
                {IMPORTABLE_FIELDS.map((def) => (
                  <tr key={def.field}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {def.label}
                        {def.required && <span className="text-red-500"> *</span>}
                      </p>
                      <p className="text-xs text-slate-500">{def.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={mapping[def.field] ?? ""}
                        onChange={(e) => handleMappingChange(def.field, e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">— Not mapped —</option>
                        {sheet.columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMapping}
              onChange={(e) => setRememberMapping(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Remember this mapping for future imports
          </label>

          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={startOver}>
              Start over
            </Button>
            <Button type="button" disabled={!requiredFieldsMapped || isPending} onClick={handlePreview}>
              {isPending ? "Checking..." : "Preview & validate"}
            </Button>
            {!requiredFieldsMapped && (
              <span className="text-sm text-red-600">Map all required fields to continue.</span>
            )}
          </div>
        </div>
      )}

      {step === "preview" && preview && counts && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewStat label="New participants" value={counts.create} tone="indigo" />
            <PreviewStat label="Updates" value={counts.update} tone="amber" />
            <PreviewStat label="Duplicates in file" value={counts.duplicate} tone="slate" />
            <PreviewStat label="Blocked (errors)" value={counts.error} tone="red" />
          </div>

          <Card padding="none" className="max-h-[28rem] overflow-auto">
            <Table>
              <THead className="sticky top-0">
                <tr>
                  <Th>Row</Th>
                  <Th>Name</Th>
                  <Th>Business</Th>
                  <Th>Outcome</Th>
                  <Th>Notes</Th>
                </tr>
              </THead>
              <TBody>
                {preview.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                  <tr key={row.rowNumber} className={row.outcome === "error" ? "bg-red-50/50" : undefined}>
                    <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-3 text-slate-900">{row.values.ptp_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.values.business_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          OUTCOME_TONE[row.outcome],
                        )}
                      >
                        {OUTCOME_LABEL[row.outcome]}
                        {row.matchedParticipantName ? ` — ${row.matchedParticipantName}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {row.issues.map((issue, i) => (
                        <p key={i} className={issue.severity === "error" ? "text-red-600" : "text-amber-600"}>
                          {issue.message}
                        </p>
                      ))}
                    </td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </Card>
          {preview.length > PREVIEW_ROW_LIMIT && (
            <p className="text-xs text-slate-500">
              Showing the first {PREVIEW_ROW_LIMIT} of {preview.length} rows.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Advisor for rows without a recognised advisor
              </label>
              <select
                value={fallbackAdvisorId}
                onChange={(e) => setFallbackAdvisorId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {advisors.map((advisor) => (
                  <option key={advisor.id} value={advisor.id}>
                    {advisor.full_name} ({advisor.office_name})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              New participants only use this when the file doesn&apos;t already specify an advisor.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep("map")}>
              Back to mapping
            </Button>
            <Button
              type="button"
              disabled={isPending || counts.create + counts.update === 0}
              onClick={handleConfirmImport}
            >
              {isPending ? "Importing..." : "Confirm & import"}
            </Button>
            {counts.create + counts.update === 0 && (
              <span className="text-sm text-red-600">No rows are ready to import.</span>
            )}
          </div>
        </div>
      )}

      {step === "summary" && result && (
        <div className="space-y-4">
          <div
            className={clsx(
              "rounded-xl border p-6",
              result.status === "Success" && "border-emerald-200 bg-emerald-50",
              result.status === "Partial" && "border-amber-200 bg-amber-50",
              result.status === "Failed" && "border-red-200 bg-red-50",
            )}
          >
            <p className="text-lg font-semibold text-slate-900">Import {result.status.toLowerCase()}</p>
            <p className="mt-1 text-sm text-slate-600">
              {fileName} — {result.rowCount} rows processed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <PreviewStat label="Processed" value={result.rowCount} tone="slate" />
            <PreviewStat label="Created" value={result.createdCount} tone="indigo" />
            <PreviewStat label="Updated" value={result.updatedCount} tone="amber" />
            <PreviewStat label="Duplicates" value={result.duplicateCount} tone="slate" />
            <PreviewStat label="Errors" value={result.errorCount} tone="red" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button href={`/advisors/${advisorId}/data-sync/history/${result.batchId}`}>
              View import details
            </Button>
            <Button variant="secondary" href={`/advisors/${advisorId}/participants`}>
              Go to participants
            </Button>
            <Button type="button" variant="secondary" onClick={startOver}>
              Import another file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardSteps({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map columns" },
    { key: "preview", label: "Preview & validate" },
    { key: "summary", label: "Summary" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              i < activeIndex && "bg-emerald-100 text-emerald-700",
              i === activeIndex && "bg-indigo-600 text-white",
              i > activeIndex && "bg-slate-100 text-slate-400",
            )}
          >
            {i + 1}
          </span>
          <span className={i === activeIndex ? "font-medium text-slate-900" : "text-slate-500"}>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="mx-1 text-slate-300">→</span>}
        </li>
      ))}
    </ol>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "indigo" | "amber" | "slate" | "red";
}) {
  const toneClass = {
    indigo: "text-indigo-600",
    amber: "text-amber-600",
    slate: "text-slate-900",
    red: "text-red-600",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={clsx("mt-1 text-xl font-semibold", toneClass)}>{value}</p>
    </div>
  );
}
