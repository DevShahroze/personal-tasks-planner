import {
  isoWeekdayInTimeZone,
  minutesFromMidnight,
  ymdInTimeZone,
  zonedDateTimeToUtc,
  intervalsOverlap,
} from "./time.js";
import { isHolidayCalendarConfigured, isPublicHolidayYmd } from "./holidays.js";

export function availabilityWindowForDay(ymd, availability, timeZone) {
  const customSlots = availability.timeSlots;
  if (Array.isArray(customSlots) && customSlots.length > 0) {
    const windows = [];
    for (const slot of customSlots) {
      const startMin = minutesFromMidnight(slot.startTime);
      const endMin = minutesFromMidnight(slot.endTime);
      if (startMin === null || endMin === null || startMin >= endMin) {
        continue;
      }
      const start = zonedDateTimeToUtc(ymd, slot.startTime, timeZone);
      const end = zonedDateTimeToUtc(ymd, slot.endTime, timeZone);
      if (start && end && end > start) {
        windows.push({ start, end });
      }
    }
    return windows.length ? windows : null;
  }

  const startMin = minutesFromMidnight(availability.startTime);
  const endMin = minutesFromMidnight(availability.endTime);
  if (startMin === null || endMin === null) {
    return null;
  }

  if (startMin === endMin) {
    return null;
  }

  if (startMin < endMin) {
    const start = zonedDateTimeToUtc(ymd, availability.startTime, timeZone);
    const end = zonedDateTimeToUtc(ymd, availability.endTime, timeZone);
    if (!start || !end || end <= start) {
      return null;
    }
    return [{ start, end }];
  }

  const startToday = zonedDateTimeToUtc(ymd, availability.startTime, timeZone);
  const nextYmd = ymdAddDays(ymd, 1);
  const midnightNext = zonedDateTimeToUtc(nextYmd, "00:00", timeZone);
  const endTomorrow = zonedDateTimeToUtc(nextYmd, availability.endTime, timeZone);
  const windows = [];
  if (startToday && midnightNext && midnightNext > startToday) {
    windows.push({ start: startToday, end: midnightNext });
  }
  if (midnightNext && endTomorrow && endTomorrow > midnightNext) {
    windows.push({ start: midnightNext, end: endTomorrow });
  }
  return windows.length ? windows : null;
}

function ymdAddDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function isDayAllowed(date, schedule) {
  const tz = schedule.timezone;
  const ymd = ymdInTimeZone(date, tz);
  if (!ymd) {
    return false;
  }
  const weekday = isoWeekdayInTimeZone(date, tz);
  if (!weekday || !schedule.availability.daysOfWeek.includes(weekday)) {
    return false;
  }
  if (
    schedule.availability.excludePublicHolidays &&
    isHolidayCalendarConfigured() &&
    isPublicHolidayYmd(ymd)
  ) {
    return false;
  }
  return true;
}

export function intervalWithinAvailability(start, end, schedule) {
  if (!(start instanceof Date) || !(end instanceof Date) || end <= start) {
    return false;
  }
  const tz = schedule.timezone;
  const startYmd = ymdInTimeZone(start, tz);
  const endYmd = ymdInTimeZone(end, tz);
  if (!startYmd || !endYmd) {
    return false;
  }
  if (startYmd !== endYmd) {
    return false;
  }
  if (!isDayAllowed(start, schedule)) {
    return false;
  }
  const windows = availabilityWindowForDay(startYmd, schedule.availability, tz);
  if (!windows) {
    return false;
  }
  return windows.some((window) => start >= window.start && end <= window.end);
}

export function intervalRespectsDateBounds(start, end, schedule) {
  const tz = schedule.timezone;
  if (schedule.earliestDate) {
    const earliestYmd = ymdInTimeZone(schedule.earliestDate, tz);
    const startYmd = ymdInTimeZone(start, tz);
    if (earliestYmd && startYmd && startYmd < earliestYmd) {
      return false;
    }
  }
  if (schedule.dueDate) {
    const dueYmd = ymdInTimeZone(schedule.dueDate, tz);
    const endYmd = ymdInTimeZone(end, tz);
    if (dueYmd && endYmd && endYmd > dueYmd) {
      return false;
    }
  }
  return true;
}

export function templateToAvailabilitySnapshot(template) {
  return {
    daysOfWeek: [...template.daysOfWeek],
    startTime: template.startTime,
    endTime: template.endTime,
    excludePublicHolidays: Boolean(template.excludePublicHolidays),
    timeSlots: [],
  };
}

export { intervalsOverlap };
