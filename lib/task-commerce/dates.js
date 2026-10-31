import { parseDateOnlyInput } from "../scheduling/time.js";

export function parseOptionalTaskDate(value, label, errors) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      errors.push(`Invalid ${label}`);
      return null;
    }
    return value;
  }
  const parsed = parseDateOnlyInput(
    value instanceof Date ? value : String(value).trim(),
  );
  if (!parsed || !(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
    errors.push(`Invalid ${label}`);
    return null;
  }
  const ymd = parsed.toISOString().slice(0, 10);
  return new Date(`${ymd}T12:00:00.000Z`);
}
