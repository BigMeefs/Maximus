import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { ImportRow } from "./types";

export type ParsedSheet = {
  columns: string[];
  rows: ImportRow[];
};

// Parses an uploaded .csv/.xlsx file into column headers + raw rows. Kept
// separate from transform/validation/matching so a future Power BI API
// connector can produce the same ParsedSheet shape without a file at all.
export async function parseImportFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXlsx(file);
  throw new Error("Unsupported file type — please upload a .xlsx or .csv file.");
}

async function parseCsv(file: File): Promise<ParsedSheet> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const columns = (result.meta.fields ?? []).filter(Boolean);
  const rows: ImportRow[] = result.data.map((raw, index) => ({
    rowNumber: index + 2, // +1 for header row, +1 for 1-indexing
    raw,
  }));

  return { columns, rows };
}

async function parseXlsx(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook has no sheets.");

  const columns: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    columns[colNumber - 1] = cellText(cell.value).trim();
  });

  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const raw: Record<string, unknown> = {};
    let hasValue = false;
    columns.forEach((col, idx) => {
      if (!col) return;
      const value = cellRawValue(row.getCell(idx + 1).value);
      if (value !== null && value !== undefined && value !== "") hasValue = true;
      raw[col] = value;
    });

    if (hasValue) rows.push({ rowNumber, raw });
  });

  return { columns: columns.filter(Boolean), rows };
}

function cellRawValue(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;

  if ("richText" in value) return value.richText.map((t) => t.text).join("");
  if ("result" in value) return value.result ?? null;
  if ("text" in value) return value.text;
  return null;
}

function cellText(value: ExcelJS.CellValue): string {
  const raw = cellRawValue(value);
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();
  return String(raw);
}
