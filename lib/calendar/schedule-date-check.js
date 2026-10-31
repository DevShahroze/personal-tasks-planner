import { zonedDateTimeToUtc, ymdInTimeZone } from "../scheduling/time.js";
import { isDayAllowed } from "../scheduling/availability.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";

function compareYmd(a, b) {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function validateYmdAgainstSchedule(ymd, schedule) {
  if (!ymd) {
    return { ok: true };
  }

  const timeZone = schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE;
  const dayStart = zonedDateTimeToUtc(ymd, "00:00", timeZone);
  if (!dayStart) {
    return { ok: false, message: "Invalid date" };
  }

  if (schedule?.earliestDate) {
    const earliestYmd = ymdInTimeZone(
      schedule.earliestDate instanceof Date
        ? schedule.earliestDate
        : new Date(schedule.earliestDate),
      timeZone,
    );
    if (earliestYmd && compareYmd(ymd, earliestYmd) < 0) {
      return { ok: false, message: "Date is before the earliest allowed date" };
    }
  }

  if (schedule?.dueDate) {
    const dueYmd = ymdInTimeZone(
      schedule.dueDate instanceof Date ? schedule.dueDate : new Date(schedule.dueDate),
      timeZone,
    );
    if (dueYmd && compareYmd(ymd, dueYmd) > 0) {
      return { ok: false, message: "Date is after the deadline" };
    }
  }

  if (schedule?.mode && schedule.mode !== "unscheduled" && schedule.availability) {
    if (!isDayAllowed(dayStart, schedule)) {
      return { ok: false, message: "Date is not allowed by availability rules" };
    }
  }

  return { ok: true };
}
