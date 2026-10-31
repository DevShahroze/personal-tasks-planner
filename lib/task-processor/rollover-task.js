import { normalizeStoredSchedule } from "../scheduling/defaults.js";
import {
  intervalWithinAvailability,
  isDayAllowed,
} from "../scheduling/availability.js";
import { suggestFlexibleSlots } from "../scheduling/slots.js";
import { hmInTimeZone, ymdInTimeZone, zonedDateTimeToUtc } from "../scheduling/time.js";
import { ymdAddDays, utcDateFromYmd } from "./dates.js";

const MAX_DAY_SCAN = 90;

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

    return { taskDate: utcDateFromYmd(cursorYmd) };
  }

  if (schedule.mode === "flexible") {
    for (let scan = 0; scan < MAX_DAY_SCAN; scan += 1) {
      const scanSchedule = {
        ...schedule,
        earliestDate: utcDateFromYmd(cursorYmd),
      };
      const result = suggestFlexibleSlots({
        schedule: scanSchedule,
        blockingIntervals: [],
        limit: 1,
        now: new Date(),
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
    return { taskDate: utcDateFromYmd(fromYmd) };
  }

  return { taskDate: utcDateFromYmd(fromYmd) };
}

export function buildRolloverPatch(task, businessYmd) {
  const schedule = normalizeStoredSchedule(task.schedule);
  if (schedule.mode !== "fixed" && schedule.mode !== "flexible") {
    return { taskDate: utcDateFromYmd(ymdAddDays(businessYmd, 1)) };
  }
  return buildSchedulePatchStartingAtYmd(task, ymdAddDays(businessYmd, 1));
}
