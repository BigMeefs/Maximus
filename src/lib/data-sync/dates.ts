import { format, isValid, parse } from "date-fns";

// Excel/Power BI exports store dates as serial numbers counting from this
// epoch (with the well-known 1900 leap-year bug baked in, hence 30 not 31).
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;

const KNOWN_FORMATS = ["dd/MM/yyyy", "d/M/yyyy", "yyyy/MM/dd", "MM/dd/yyyy", "dd-MM-yyyy"];

// Normalizes a raw spreadsheet cell value into an ISO yyyy-MM-dd string.
// Returns the original trimmed string (unparsed) if nothing recognizes it,
// so downstream validation can flag it as an invalid date rather than
// silently dropping the value.
export function normalizeDateValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : null;
  }

  if (typeof value === "number") {
    const date = new Date(EXCEL_EPOCH_MS + value * DAY_MS);
    return isValid(date) ? format(date, "yyyy-MM-dd") : null;
  }

  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  for (const fmt of KNOWN_FORMATS) {
    const parsed = parse(str, fmt, new Date());
    if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  }

  const fallback = new Date(str);
  return isValid(fallback) ? format(fallback, "yyyy-MM-dd") : str;
}
