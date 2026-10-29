import {
  DEFAULT_SLOT_LIMIT,
  MAX_SLOT_SCAN_DAYS,
  SLOT_STEP_MINUTES,
} from "./constants.js";
import {
  availabilityWindowForDay,
  intervalsOverlap,
  isDayAllowed,
} from "./availability.js";
import { ymdInTimeZone, addMinutes, zonedDateTimeToUtc } from "./time.js";

function ymdAddDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function compareYmd(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function suggestFlexibleSlots({
  schedule,
  blockingIntervals,
  limit = DEFAULT_SLOT_LIMIT,
  scanDays = MAX_SLOT_SCAN_DAYS,
  now = new Date(),
}) {
  if (schedule.mode !== "flexible") {
    return { ok: false, error: "Task is not in flexible scheduling mode", slots: [] };
  }
  if (!schedule.durationMinutes) {
    return { ok: false, error: "Duration is required for slot suggestions", slots: [] };
  }

  const tz = schedule.timezone;
  const duration = schedule.durationMinutes;
  const slots = [];

  let startYmd = schedule.earliestDate
    ? ymdInTimeZone(schedule.earliestDate, tz)
    : ymdInTimeZone(now, tz);
  if (!startYmd) {
    return { ok: false, error: "Could not determine start date", slots: [] };
  }

  const dueYmd = schedule.dueDate ? ymdInTimeZone(schedule.dueDate, tz) : null;
  let scanned = 0;

  while (slots.length < limit && scanned < scanDays) {
    if (dueYmd && compareYmd(startYmd, dueYmd) > 0) {
      break;
    }

    const dayStart = zonedDateTimeToUtc(startYmd, "00:00", tz);
    if (dayStart && isDayAllowed(dayStart, schedule)) {
      const windows = availabilityWindowForDay(startYmd, schedule.availability, tz);
      if (windows) {
        for (const window of windows) {
          let cursor = window.start;
          while (slots.length < limit) {
            const candidateEnd = addMinutes(cursor, duration);
            if (candidateEnd > window.end) {
              break;
            }
            if (dueYmd) {
              const endYmd = ymdInTimeZone(candidateEnd, tz);
              if (endYmd && compareYmd(endYmd, dueYmd) > 0) {
                break;
              }
            }
            const blocked = blockingIntervals.some((block) =>
              intervalsOverlap(cursor, candidateEnd, block.start, block.end),
            );
            if (!blocked && cursor >= now) {
              slots.push({
                scheduledStart: cursor,
                scheduledEnd: candidateEnd,
              });
              if (slots.length >= limit) {
                break;
              }
            }
            cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
          }
        }
      }
    }

    startYmd = ymdAddDays(startYmd, 1);
    scanned += 1;
  }

  if (!slots.length) {
    return {
      ok: true,
      slots: [],
      message: "No eligible time slots were found for this task",
    };
  }

  return { ok: true, slots, message: null };
}
