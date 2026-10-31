import { validateYmdAgainstSchedule } from "../calendar/schedule-date-check.js";
import { utcDateFromYmd } from "../task-processor/dates.js";
import { buildSchedulePatchStartingAtYmd } from "../task-processor/rollover-task.js";
import { normalizeStoredSchedule } from "./defaults.js";
import { ymdInTimeZone } from "./time.js";

export function firstSchedulableYmdOnOrAfter(fromYmd, schedule) {
  if (!fromYmd) {
    return fromYmd;
  }
  const normalized = normalizeStoredSchedule(schedule);
  if (normalized.mode === "unscheduled") {
    return fromYmd;
  }
  const check = validateYmdAgainstSchedule(fromYmd, normalized);
  if (check.ok) {
    return fromYmd;
  }
  const patch = buildSchedulePatchStartingAtYmd({ schedule: normalized }, fromYmd);
  if (!patch?.taskDate) {
    return fromYmd;
  }
  return ymdInTimeZone(patch.taskDate, normalized.timezone) || fromYmd;
}

export function alignTaskDateAndSchedule(taskDate, schedule) {
  const normalized = normalizeStoredSchedule(schedule);
  if (!taskDate || normalized.mode === "unscheduled") {
    return { taskDate, schedule: normalized, adjusted: false };
  }

  const tz = normalized.timezone;
  const ymd = ymdInTimeZone(
    taskDate instanceof Date ? taskDate : new Date(taskDate),
    tz,
  );
  if (!ymd) {
    return { taskDate, schedule: normalized, adjusted: false };
  }

  const dayCheck = validateYmdAgainstSchedule(ymd, normalized);
  if (dayCheck.ok) {
    if (
      normalized.mode === "fixed" &&
      normalized.scheduledStart &&
      normalized.scheduledEnd
    ) {
      const startYmd = ymdInTimeZone(normalized.scheduledStart, tz);
      if (startYmd !== ymd) {
        const patch = buildSchedulePatchStartingAtYmd({ schedule: normalized }, ymd);
        return {
          taskDate: patch.taskDate || utcDateFromYmd(ymd),
          schedule: patch.schedule || normalized,
          adjusted: true,
        };
      }
    }
    return { taskDate, schedule: normalized, adjusted: false };
  }

  const patch = buildSchedulePatchStartingAtYmd({ schedule: normalized }, ymd);
  const nextSchedule = { ...(patch.schedule || normalized) };
  if (normalized.mode === "flexible" && patch.taskDate) {
    nextSchedule.earliestDate = patch.taskDate;
  }
  return {
    taskDate: patch.taskDate || utcDateFromYmd(ymd),
    schedule: nextSchedule,
    adjusted: true,
  };
}

export function resolveTaskDateYmdForCalendar(task) {
  if (!task?.taskDate) {
    return null;
  }
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone;
  const ymd = ymdInTimeZone(
    task.taskDate instanceof Date ? task.taskDate : new Date(task.taskDate),
    tz,
  );
  if (!ymd) {
    return null;
  }
  if (schedule.mode === "unscheduled") {
    return ymd;
  }
  return firstSchedulableYmdOnOrAfter(ymd, schedule);
}

export function applyTaskDateAlignmentToRecord(task) {
  if (!task?.taskDate || !task?.schedule) {
    return false;
  }
  const aligned = alignTaskDateAndSchedule(task.taskDate, task.schedule);
  if (!aligned.adjusted) {
    return false;
  }
  task.taskDate = aligned.taskDate;
  task.schedule = aligned.schedule;
  return true;
}
