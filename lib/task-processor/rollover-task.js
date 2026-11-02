import { normalizeStoredSchedule } from "../scheduling/defaults.js";
import {
  intervalWithinAvailability,
  isDayAllowed,
  firstAllowedYmdOnOrAfter,
  scheduleHasRestrictedDays,
} from "../scheduling/availability.js";
import { suggestFlexibleSlots } from "../scheduling/slots.js";
import { hmInTimeZone, ymdInTimeZone, zonedDateTimeToUtc } from "../scheduling/time.js";
import { ymdAddDays, utcDateFromYmd } from "./dates.js";

const MAX_DAY_SCAN = 90;

function patchTaskDateYmd(patch, schedule) {
  if (!patch?.taskDate) {
    return null;
  }
  return ymdInTimeZone(patch.taskDate, schedule.timezone);
}

function ensurePatchOnAllowedDay(task, patch, fromYmd, schedule) {
  const ymd = patchTaskDateYmd(patch, schedule);
  if (ymd) {
    const noon = zonedDateTimeToUtc(ymd, "12:00", schedule.timezone);
    if (noon && isDayAllowed(noon, schedule)) {
      return patch;
    }
  }
  const allowedYmd = firstAllowedYmdOnOrAfter(fromYmd, schedule, MAX_DAY_SCAN);
  return buildSchedulePatchStartingAtYmd(task, allowedYmd);
}

function scheduleForRolloverScan(task, schedule) {
  if (schedule.mode === "flexible" || schedule.mode === "fixed") {
    return schedule;
  }
  if (!scheduleHasRestrictedDays(schedule)) {
    return schedule;
  }
  return {
    ...schedule,
    mode: "flexible",
    durationMinutes: schedule.durationMinutes || 60,
  };
}

export function taskMatchesBusinessDate(task, businessYmd, fallbackTimeZone) {
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone || fallbackTimeZone;

  if (task.taskDate) {
    const ymd = ymdInTimeZone(task.taskDate, tz);
    if (ymd === businessYmd) {
      return true;
    }
  }

  if (schedule.scheduledStart) {
    const ymd = ymdInTimeZone(schedule.scheduledStart, tz);
    if (ymd === businessYmd) {
      return true;
    }
  }

  return false;
}

/** Calendar day this task is considered scheduled on (task timezone, then processor tz). */
export function taskPrimaryBusinessYmd(task, fallbackTimeZone) {
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone || fallbackTimeZone;

  if (task.taskDate) {
    const ymd = ymdInTimeZone(task.taskDate, tz);
    if (ymd) {
      return ymd;
    }
  }

  if (schedule.scheduledStart) {
    return ymdInTimeZone(schedule.scheduledStart, tz);
  }

  return null;
}

export function buildSchedulePatchStartingAtYmd(task, fromYmd) {
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone;
  let cursorYmd = fromYmd;

  if (schedule.mode === "fixed" && schedule.scheduledStart && schedule.scheduledEnd) {
    const durationMs =
      schedule.scheduledEnd.getTime() - schedule.scheduledStart.getTime();
    const hm =
      hmInTimeZone(schedule.scheduledStart, tz) || schedule.availability.startTime;

    for (let scan = 0; scan < MAX_DAY_SCAN; scan += 1) {
      const noon = zonedDateTimeToUtc(cursorYmd, "12:00", tz);
      if (noon && isDayAllowed(noon, schedule)) {
        const start = zonedDateTimeToUtc(cursorYmd, hm, tz);
        if (start) {
          const end = new Date(start.getTime() + durationMs);
          if (intervalWithinAvailability(start, end, schedule)) {
            return {
              taskDate: utcDateFromYmd(cursorYmd),
              schedule: {
                ...schedule,
                scheduledStart: start,
                scheduledEnd: end,
              },
            };
          }
        }
      }
      cursorYmd = ymdAddDays(cursorYmd, 1);
    }

    const allowedYmd = firstAllowedYmdOnOrAfter(fromYmd, schedule, MAX_DAY_SCAN);
    return { taskDate: utcDateFromYmd(allowedYmd) };
  }

  if (schedule.mode === "flexible") {
    for (let scan = 0; scan < MAX_DAY_SCAN; scan += 1) {
      const scanSchedule = {
        ...schedule,
        earliestDate: utcDateFromYmd(cursorYmd),
      };
      const dayStartUtc = zonedDateTimeToUtc(cursorYmd, "00:00", tz);
      const result = suggestFlexibleSlots({
        schedule: scanSchedule,
        blockingIntervals: [],
        limit: 1,
        now: dayStartUtc || new Date(),
      });
      const slot = result.slots?.[0];
      if (slot) {
        const slotYmd = ymdInTimeZone(slot.scheduledStart, tz) || cursorYmd;
        return {
          taskDate: utcDateFromYmd(slotYmd),
          schedule: {
            ...schedule,
            scheduledStart: slot.scheduledStart,
            scheduledEnd: slot.scheduledEnd,
          },
        };
      }
      cursorYmd = ymdAddDays(cursorYmd, 1);
    }
    const allowedYmd = firstAllowedYmdOnOrAfter(fromYmd, schedule, MAX_DAY_SCAN);
    return buildSchedulePatchStartingAtYmd(task, allowedYmd);
  }

  return { taskDate: utcDateFromYmd(fromYmd) };
}

export function buildRolloverPatch(task, businessYmd) {
  const schedule = normalizeStoredSchedule(task.schedule);
  const nextYmd = ymdAddDays(businessYmd, 1);
  const scanSchedule = scheduleForRolloverScan(task, schedule);
  const scanTask =
    scanSchedule === schedule ? task : { ...task, schedule: scanSchedule };

  if (scanSchedule.mode === "fixed" || scanSchedule.mode === "flexible") {
    const patch = buildSchedulePatchStartingAtYmd(scanTask, nextYmd);
    return ensurePatchOnAllowedDay(scanTask, patch, nextYmd, scanSchedule);
  }

  if (scheduleHasRestrictedDays(schedule)) {
    const patch = buildSchedulePatchStartingAtYmd(scanTask, nextYmd);
    return ensurePatchOnAllowedDay(scanTask, patch, nextYmd, scanSchedule);
  }

  return { taskDate: utcDateFromYmd(nextYmd) };
}
