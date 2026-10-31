import { PROCESSOR_MAX_CATCHUP_DAYS, PROCESSOR_ROLLOVER_HOUR } from "./constants.js";
import { ymdInTimeZone } from "@/lib/scheduling/time.js";

export function ymdAddDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function compareYmd(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function localHourInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value;
  return hour ? Number(hour) : 0;
}

/** Latest business date whose incomplete tasks may be rolled (after 11 PM local). */
export function latestRolloverBusinessYmd(now, timeZone) {
  const todayYmd = ymdInTimeZone(now, timeZone);
  if (!todayYmd) {
    return null;
  }
  const hour = localHourInTimeZone(now, timeZone);
  if (hour >= PROCESSOR_ROLLOVER_HOUR) {
    return todayYmd;
  }
  return ymdAddDays(todayYmd, -1);
}

export function businessDatesNeedingRuns(lastCompletedBusinessYmd, now, timeZone) {
  const endYmd = latestRolloverBusinessYmd(now, timeZone);
  if (!endYmd) {
    return [];
  }

  let startYmd = endYmd;
  if (lastCompletedBusinessYmd) {
    startYmd = ymdAddDays(lastCompletedBusinessYmd, 1);
    if (compareYmd(startYmd, endYmd) > 0) {
      return [];
    }
  }

  const dates = [];
  let cursor = startYmd;
  let guard = 0;
  while (compareYmd(cursor, endYmd) <= 0 && guard < PROCESSOR_MAX_CATCHUP_DAYS) {
    dates.push(cursor);
    cursor = ymdAddDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

/** Manual trigger: catch up through today (ignores the 11 PM cutoff). */
export function businessDatesForManualRun(lastCompletedBusinessYmd, now, timeZone) {
  const endYmd = ymdInTimeZone(now, timeZone);
  if (!endYmd) {
    return [];
  }

  let startYmd = endYmd;
  if (lastCompletedBusinessYmd) {
    startYmd = ymdAddDays(lastCompletedBusinessYmd, 1);
    if (compareYmd(startYmd, endYmd) > 0) {
      return [];
    }
  }

  const dates = [];
  let cursor = startYmd;
  let guard = 0;
  while (compareYmd(cursor, endYmd) <= 0 && guard < PROCESSOR_MAX_CATCHUP_DAYS) {
    dates.push(cursor);
    cursor = ymdAddDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

export function utcDateFromYmd(ymd) {
  const parsed = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
