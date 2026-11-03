import { PROCESSOR_MAX_CATCHUP_DAYS } from "./constants.js";
import { ymdInTimeZone } from "../scheduling/time.js";

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

/** Latest business date eligible for automatic rollover (previous calendar day after midnight). */
export function latestRolloverBusinessYmd(now, timeZone) {
  const todayYmd = ymdInTimeZone(now, timeZone);
  if (!todayYmd) {
    return null;
  }
  return ymdAddDays(todayYmd, -1);
}

export function businessDatesNeedingRuns(lastCompletedBusinessYmd, now, timeZone) {
  const todayYmd = ymdInTimeZone(now, timeZone);
  let endYmd = latestRolloverBusinessYmd(now, timeZone);
  if (!endYmd || !todayYmd) {
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

/** Manual trigger uses the same business-date window as automatic runs. */
export function businessDatesForManualRun(lastCompletedBusinessYmd, now, timeZone) {
  return businessDatesNeedingRuns(lastCompletedBusinessYmd, now, timeZone);
}

export function utcDateFromYmd(ymd) {
  const parsed = new Date(`${ymd}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
