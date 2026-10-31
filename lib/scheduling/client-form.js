import {
  ymdInTimeZone,
  hmInTimeZone,
  zonedDateTimeToUtc,
  addMinutes,
  minutesFromMidnight,
} from "./time.js";
import { addIntervalToYmd } from "../recurrence/calculate.js";
import { normalizeStoredSchedule } from "./defaults.js";
import { formatDateTime } from "../format.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "./constants.js";

const DEFAULT_VISIT_DURATION_MINUTES = 60;

function hasAppointmentTimes(state) {
  return Boolean(state.scheduledDate && state.scheduledStartTime);
}

export function inferScheduleModeFromFormState(state) {
  if (hasAppointmentTimes(state)) {
    return "fixed";
  }
  if (state.visitAvailabilityEnabled) {
    return "flexible";
  }
  return "unscheduled";
}

export function visitAvailabilityEnabledFromSchedule(raw) {
  const schedule = normalizeStoredSchedule(raw);
  return schedule.mode === "flexible";
}

export function scheduleFromFormState(state) {
  const mode = inferScheduleModeFromFormState(state);
  const durationMinutes = state.durationMinutes
    ? Number(state.durationMinutes)
    : mode === "flexible"
      ? DEFAULT_VISIT_DURATION_MINUTES
      : null;

  const schedule = {
    mode,
    earliestDate: state.earliestDate || state.scheduledDate || null,
    dueDate: state.dueDate || null,
    durationMinutes,
    timezone: state.timezone || DEFAULT_SCHEDULE_TIMEZONE,
    availabilityTemplateId: state.availabilityTemplateId || null,
    avoidConflicts: state.avoidConflicts,
    availability: {
      daysOfWeek: state.daysOfWeek,
      startTime: state.startTime,
      endTime: state.endTime,
      excludePublicHolidays: state.excludePublicHolidays,
      timeSlots: (state.timeSlots || [])
        .filter((slot) => slot?.startTime && slot?.endTime)
        .map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
        })),
    },
    scheduledStart: null,
    scheduledEnd: null,
  };

  if (mode === "fixed") {
    const start = zonedDateTimeToUtc(
      state.scheduledDate,
      state.scheduledStartTime,
      schedule.timezone,
    );
    let endDateYmd = state.scheduledDate;
    if (state.scheduledEndTime) {
      const startMin = minutesFromMidnight(state.scheduledStartTime);
      const endMin = minutesFromMidnight(state.scheduledEndTime);
      if (startMin !== null && endMin !== null && endMin <= startMin) {
        endDateYmd = addIntervalToYmd(state.scheduledDate, 1, "days");
      }
    }
    let end = state.scheduledEndTime
      ? zonedDateTimeToUtc(endDateYmd, state.scheduledEndTime, schedule.timezone)
      : null;
    if (start && !end) {
      end = addMinutes(start, durationMinutes || DEFAULT_VISIT_DURATION_MINUTES);
    }
    schedule.scheduledStart = start ? start.toISOString() : null;
    schedule.scheduledEnd = end ? end.toISOString() : null;
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
    visitAvailabilityEnabled: visitAvailabilityEnabledFromSchedule(raw),
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
    timeSlots: Array.isArray(schedule.availability.timeSlots)
      ? schedule.availability.timeSlots.map((slot) => ({
          startTime: slot.startTime || "",
          endTime: slot.endTime || "",
        }))
      : [],
    scheduledDate: scheduledDate || "",
    scheduledStartTime: schedule.scheduledStart
      ? hmInTimeZone(schedule.scheduledStart, tz)
      : "",
    scheduledEndTime: schedule.scheduledEnd
      ? hmInTimeZone(schedule.scheduledEnd, tz)
      : "",
  };
}

export function formatScheduleInstant(value, timeZone) {
  return formatDateTime(value, timeZone || DEFAULT_SCHEDULE_TIMEZONE);
}
