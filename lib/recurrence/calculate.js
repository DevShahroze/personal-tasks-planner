import { ymdInTimeZone, zonedDateTimeToUtc } from "../scheduling/time.js";

function parseYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { y, m, d };
}

function formatYmd(y, m, d) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addIntervalToYmd(ymd, interval, unit) {
  if (!ymd || !interval || interval < 1) {
    return null;
  }
  const { y, m, d } = parseYmd(ymd);
  if (!y || !m || !d) {
    return null;
  }

  if (unit === "days") {
    const dt = new Date(Date.UTC(y, m - 1, d + interval));
    return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  if (unit === "weeks") {
    const dt = new Date(Date.UTC(y, m - 1, d + interval * 7));
    return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  if (unit === "years") {
    const targetMonth = m;
    const maxDay = daysInMonth(y + interval, targetMonth);
    const day = Math.min(d, maxDay);
    return formatYmd(y + interval, targetMonth, day);
  }

  if (unit === "months") {
    let targetYear = y;
    let targetMonth = m + interval;
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }
    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    const maxDay = daysInMonth(targetYear, targetMonth);
    const day = Math.min(d, maxDay);
    return formatYmd(targetYear, targetMonth, day);
  }

  return null;
}

export function ymdToUtcDate(ymd, timeZone) {
  return zonedDateTimeToUtc(ymd, "00:00", timeZone);
}

export function dateToYmd(date, timeZone) {
  if (!date) {
    return null;
  }
  return ymdInTimeZone(date instanceof Date ? date : new Date(date), timeZone);
}

export function getRecurrenceAnchorYmd(recurrence, timeZone) {
  if (recurrence.lastProcedureDate) {
    return dateToYmd(recurrence.lastProcedureDate, timeZone);
  }
  if (recurrence.lastCompletedDate) {
    return dateToYmd(recurrence.lastCompletedDate, timeZone);
  }
  return null;
}

export function calculateNextDueDate(recurrence, timeZone) {
  if (!recurrence?.enabled) {
    return { nextDueDate: null, needsStartingDate: false };
  }

  const anchorYmd = getRecurrenceAnchorYmd(recurrence, timeZone);
  if (!anchorYmd) {
    return { nextDueDate: null, needsStartingDate: true };
  }

  const nextYmd = addIntervalToYmd(anchorYmd, recurrence.interval, recurrence.unit);
  if (!nextYmd) {
    return { nextDueDate: null, needsStartingDate: false };
  }

  const nextDate = ymdToUtcDate(nextYmd, timeZone);
  if (recurrence.endDate && nextDate.getTime() > recurrence.endDate.getTime()) {
    return { nextDueDate: null, needsStartingDate: false };
  }

  return { nextDueDate: nextDate, needsStartingDate: false };
}

export function applyRecurrenceCompletion(recurrence, input, timeZone) {
  const next = { ...recurrence };
  const completedDate = input.completedDate ? new Date(input.completedDate) : null;
  if (!completedDate || Number.isNaN(completedDate.getTime())) {
    return { ok: false, error: "Completion date is required" };
  }

  next.lastCompletedDate = completedDate;

  if (
    input.procedureDate !== undefined &&
    input.procedureDate !== null &&
    input.procedureDate !== ""
  ) {
    const procedureDate = new Date(input.procedureDate);
    if (Number.isNaN(procedureDate.getTime())) {
      return { ok: false, error: "Invalid procedure date" };
    }
    next.lastProcedureDate = procedureDate;
  }

  const anchorYmd = getRecurrenceAnchorYmd(next, timeZone);
  const nextYmd = anchorYmd
    ? addIntervalToYmd(anchorYmd, next.interval, next.unit)
    : null;
  next.nextDueDate = nextYmd ? ymdToUtcDate(nextYmd, timeZone) : null;

  if (
    next.endDate &&
    next.nextDueDate &&
    next.nextDueDate.getTime() > next.endDate.getTime()
  ) {
    next.nextDueDate = null;
  }

  return { ok: true, recurrence: next };
}
