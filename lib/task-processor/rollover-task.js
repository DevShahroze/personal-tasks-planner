import { normalizeStoredSchedule } from "@/lib/scheduling/defaults.js";
import {
  intervalWithinAvailability,
  isDayAllowed,
} from "@/lib/scheduling/availability.js";
import { suggestFlexibleSlots } from "@/lib/scheduling/slots.js";
import {
  hmInTimeZone,
  ymdInTimeZone,
  zonedDateTimeToUtc,
} from "@/lib/scheduling/time.js";
import { ymdAddDays, utcDateFromYmd } from "@/lib/task-processor/dates.js";

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

export function buildRolloverPatch(task, businessYmd) {
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone;
  const nextStartYmd = ymdAddDays(businessYmd, 1);

  if (schedule.mode === "fixed" && schedule.scheduledStart && schedule.scheduledEnd) {
    const durationMs =
      schedule.scheduledEnd.getTime() - schedule.scheduledStart.getTime();
    const hm =
      hmInTimeZone(schedule.scheduledStart, tz) || schedule.availability.startTime;

    let cursorYmd = nextStartYmd;
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

    return { taskDate: utcDateFromYmd(nextStartYmd) };
  }

  if (schedule.mode === "flexible") {
    const scanSchedule = {
      ...schedule,
      earliestDate: utcDateFromYmd(nextStartYmd),
    };
    const result = suggestFlexibleSlots({
      schedule: scanSchedule,
      blockingIntervals: [],
      limit: 1,
      now: new Date(),
    });
    const slot = result.slots?.[0];
    if (slot) {
      const slotYmd = ymdInTimeZone(slot.scheduledStart, tz) || nextStartYmd;
      return {
        taskDate: utcDateFromYmd(slotYmd),
        schedule: {
          ...schedule,
          scheduledStart: slot.scheduledStart,
          scheduledEnd: slot.scheduledEnd,
        },
      };
    }
    return { taskDate: utcDateFromYmd(nextStartYmd) };
  }

  return { taskDate: utcDateFromYmd(nextStartYmd) };
}
