import { ISO_WEEKDAYS } from "./constants.js";

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function parseHHmm(value) {
  if (typeof value !== "string" || !HHMM_RE.test(value)) {
    return null;
  }
  const [, hh, mm] = HHMM_RE.exec(value);
  return { hours: Number(hh), minutes: Number(mm) };
}

export function minutesFromMidnight(value) {
  const parsed = parseHHmm(value);
  if (!parsed) {
    return null;
  }
  return parsed.hours * 60 + parsed.minutes;
}

export function isoWeekdayInTimeZone(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] || null;
}

export function ymdInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

export function hmInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  if (hour === undefined || minute === undefined) {
    return null;
  }
  return `${hour}:${minute}`;
}

function getTimeZoneOffsetMs(at, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return asUtc - at.getTime();
}

export function zonedDateTimeToUtc(ymd, hm, timeZone) {
  if (!ymd || !hm || !parseHHmm(hm)) {
    return null;
  }
  const [y, m, d] = ymd.split("-").map(Number);
  const { hours, minutes } = parseHHmm(hm);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hours, minutes, 0, 0));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function startOfZonedDayUtc(ymd, timeZone) {
  return zonedDateTimeToUtc(ymd, "00:00", timeZone);
}

export function parseDateOnlyInput(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function validateDaysOfWeek(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { ok: false, error: "At least one weekday must be selected" };
  }
  const normalized = [...new Set(days.map((d) => Number(d)))].sort((a, b) => a - b);
  for (const day of normalized) {
    if (!ISO_WEEKDAYS.includes(day)) {
      return { ok: false, error: "Invalid weekday in availability" };
    }
  }
  return { ok: true, value: normalized };
}

export function intervalsOverlap(startA, endA, startB, endB) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}
