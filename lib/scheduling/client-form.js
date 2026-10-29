import { ymdInTimeZone, hmInTimeZone, zonedDateTimeToUtc, addMinutes } from "./time.js";
import { normalizeStoredSchedule } from "./defaults.js";
import { formatDateTime } from "@/lib/format.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "./constants.js";

export function scheduleFromFormState(state) {
  const schedule = {
    mode: state.mode,
    earliestDate: state.earliestDate || null,
    dueDate: state.dueDate || null,
    durationMinutes: state.durationMinutes ? Number(state.durationMinutes) : null,
    timezone: state.timezone,
    availabilityTemplateId: state.availabilityTemplateId || null,
    avoidConflicts: state.avoidConflicts,
    availability: {
      daysOfWeek: state.daysOfWeek,
      startTime: state.startTime,
      endTime: state.endTime,
      excludePublicHolidays: state.excludePublicHolidays,
    },
    scheduledStart: null,
    scheduledEnd: null,
  };

  if (state.mode === "fixed") {
    const start = zonedDateTimeToUtc(
      state.scheduledDate,
      state.scheduledStartTime,
      state.timezone,
    );
    let end = zonedDateTimeToUtc(
      state.scheduledDate,
      state.scheduledEndTime,
      state.timezone,
    );
    if (start && !end && schedule.durationMinutes) {
      end = addMinutes(start, schedule.durationMinutes);
    }
    schedule.scheduledStart = start ? start.toISOString() : null;
    schedule.scheduledEnd = end ? end.toISOString() : null;
  }

  if (state.mode === "flexible" && state.selectedSlot) {
    schedule.scheduledStart = state.selectedSlot.scheduledStart;
    schedule.scheduledEnd = state.selectedSlot.scheduledEnd;
  }

  return schedule;
}

export function formStateFromSchedule(raw) {
  const schedule = normalizeStoredSchedule(raw);
  const tz = schedule.timezone;
  const scheduledDate =
    schedule.scheduledStart && ymdInTimeZone(schedule.scheduledStart, tz);
  return {
    mode: schedule.mode,
    earliestDate: schedule.earliestDate ? ymdInTimeZone(schedule.earliestDate, tz) : "",
    dueDate: schedule.dueDate ? ymdInTimeZone(schedule.dueDate, tz) : "",
    durationMinutes: schedule.durationMinutes ? String(schedule.durationMinutes) : "",
    timezone: tz,
    availabilityTemplateId: schedule.availabilityTemplateId
      ? String(schedule.availabilityTemplateId)
      : "",
    avoidConflicts: schedule.avoidConflicts,
    daysOfWeek: schedule.availability.daysOfWeek,
    startTime: schedule.availability.startTime,
    endTime: schedule.availability.endTime,
    excludePublicHolidays: schedule.availability.excludePublicHolidays,
    scheduledDate: scheduledDate || "",
    scheduledStartTime: schedule.scheduledStart
      ? hmInTimeZone(schedule.scheduledStart, tz)
      : "",
    scheduledEndTime: schedule.scheduledEnd
      ? hmInTimeZone(schedule.scheduledEnd, tz)
      : "",
    selectedSlot: null,
  };
}

export function formatScheduleInstant(value, timeZone) {
  return formatDateTime(value, timeZone || DEFAULT_SCHEDULE_TIMEZONE);
}
