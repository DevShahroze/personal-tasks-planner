const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "UTC";

function partsLookup(parts) {
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function formatDate(value, timeZone = DISPLAY_TIME_ZONE) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = partsLookup(
    new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).formatToParts(date),
  );
  return `${parts.month}/${parts.day}/${parts.year}`;
}

export function formatDateTime(value, timeZone = DISPLAY_TIME_ZONE) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = partsLookup(
    new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      timeZone,
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(date),
  );
  return `${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

/** Display `YYYY-MM-DD` as MM/DD/YYYY (calendar keys stay ISO internally). */
export function formatYmd(ymd) {
  if (!ymd) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!match) return String(ymd);
  return `${match[2]}/${match[3]}/${match[1]}`;
}

export function formatCurrency(amount, currency = "PKR") {
  if (amount === null || amount === undefined || amount === "") {
    return "—";
  }
  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat(DISPLAY_LOCALE, {
      style: "currency",
      currency: currency || "PKR",
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency || "PKR"}`;
  }
}

export function previewText(text, max = 120) {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}
