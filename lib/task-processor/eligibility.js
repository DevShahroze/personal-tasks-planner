import { compareYmd, latestRolloverBusinessYmd } from "./dates.js";
import { taskMatchesBusinessDate, taskPrimaryBusinessYmd } from "./rollover-task.js";
import { ymdInTimeZone } from "../scheduling/time.js";

/** @typedef {"past" | "present" | "future"} RolloverDateBucket */

export function taskRolloverDateBucket(taskYmd, todayYmd) {
  if (!taskYmd || !todayYmd) {
    return null;
  }
  if (compareYmd(taskYmd, todayYmd) < 0) {
    return "past";
  }
  if (compareYmd(taskYmd, todayYmd) === 0) {
    return "present";
  }
  return "future";
}

/**
 * Whether an eligible task should move on this processor pass.
 * Scans past (always roll), present (automatic only after the calendar day ends), future (never roll).
 */
export function taskShouldRollNow(task, now, tz, rolloverStatuses, options = {}) {
  const manual = Boolean(options.manual);
  if (!rolloverStatuses.includes(task.status)) {
    return false;
  }

  const ymd = taskPrimaryBusinessYmd(task, tz);
  if (!ymd || !taskMatchesBusinessDate(task, ymd, tz)) {
    return false;
  }

  const todayYmd = ymdInTimeZone(now, tz);
  if (!todayYmd) {
    return false;
  }

  const bucket = taskRolloverDateBucket(ymd, todayYmd);
  if (bucket === "future") {
    return false;
  }
  if (bucket === "past") {
    return true;
  }

  if (manual) {
    return true;
  }

  const endYmd = latestRolloverBusinessYmd(now, tz);
  if (!endYmd) {
    return false;
  }
  return compareYmd(ymd, endYmd) <= 0 && compareYmd(endYmd, todayYmd) >= 0;
}

export function summarizeRolloverTaskScan(
  tasks,
  now,
  tz,
  rolloverStatuses,
  options = {},
) {
  const todayYmd = ymdInTimeZone(now, tz);
  const counts = { past: 0, present: 0, future: 0, toRoll: 0 };

  for (const task of tasks) {
    if (!rolloverStatuses.includes(task.status)) {
      continue;
    }
    const ymd = taskPrimaryBusinessYmd(task, tz);
    if (!ymd) {
      continue;
    }
    const bucket = taskRolloverDateBucket(ymd, todayYmd);
    if (bucket && counts[bucket] !== undefined) {
      counts[bucket] += 1;
    }
    if (taskShouldRollNow(task, now, tz, rolloverStatuses)) {
      counts.toRoll += 1;
    }
  }

  return counts;
}

export function pendingBusinessDatesFromTasks(
  tasks,
  now,
  tz,
  rolloverStatuses,
  options = {},
) {
  const dates = new Set();
  for (const task of tasks) {
    if (!taskShouldRollNow(task, now, tz, rolloverStatuses)) {
      continue;
    }
    const ymd = taskPrimaryBusinessYmd(task, tz);
    if (ymd) {
      dates.add(ymd);
    }
  }
  return [...dates].sort(compareYmd);
}
