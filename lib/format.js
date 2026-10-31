const DISPLAY_LOCALE = "en-US";
const DISPLAY_TIME_ZONE = "UTC";

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseHmString(value) {
  if (typeof value !== "string" || !HHMM_RE.test(value)) {
    return null;
  }
  const [, hh, mm] = HHMM_RE.exec(value);
  return { hours: Number(hh), minutes: Number(mm) };
}

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

/** Wall-clock HH:mm (24h) → 12h with AM/PM for display. */
export function formatHm12(hm) {
  if (!hm) {
    return "—";
  }
  const parsed = parseHmString(hm);
  if (!parsed) {
    return String(hm);
  }
  const anchor = new Date(Date.UTC(2000, 0, 1, parsed.hours, parsed.minutes));
  const parts = partsLookup(
    new Intl.DateTimeFormat(DISPLAY_LOCALE, {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).formatToParts(anchor),
  );
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

export function formatAvailabilityHours(startHm, endHm, timeZone) {
  const start = formatHm12(startHm);
  const end = formatHm12(endHm);
  if (start === "—" || end === "—") {
    return null;
  }
  const zone = timeZone ? String(timeZone).trim() : "";
  if (!zone) {
    return `${start} – ${end}`;
  }
  return `${start} – ${end} (${zone})`;
}

/** Display `YYYY-MM-DD` as MM/DD/YYYY (calendar keys stay ISO internally). */
export function formatYmd(ymd) {
  if (!ymd) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!match) return String(ymd);
  return `${match[2]}/${match[3]}/${match[1]}`;
}

/** Display `YYYY-MM-DD` with weekday and spelled-out month (e.g. Friday, October 31, 2026). */
export function formatYmdLong(ymd, timeZone = DISPLAY_TIME_ZONE) {
  if (!ymd) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd));
  if (!match) return String(ymd);
  const date = new Date(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return String(ymd);
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
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
