import { DEFAULT_SCHEDULE_TIMEZONE } from "./constants.js";

export function defaultSchedule() {
  return {
    mode: "unscheduled",
    earliestDate: null,
    dueDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    durationMinutes: null,
    timezone: DEFAULT_SCHEDULE_TIMEZONE,
    availabilityTemplateId: null,
    availability: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      startTime: "00:00",
      endTime: "23:59",
      excludePublicHolidays: false,
    },
    avoidConflicts: true,
  };
}

export function normalizeStoredSchedule(raw) {
  if (!raw || typeof raw !== "object") {
    return defaultSchedule();
  }
  const base = defaultSchedule();
  return {
    mode: raw.mode || base.mode,
    earliestDate: raw.earliestDate ? new Date(raw.earliestDate) : null,
    dueDate: raw.dueDate ? new Date(raw.dueDate) : null,
    scheduledStart: raw.scheduledStart ? new Date(raw.scheduledStart) : null,
    scheduledEnd: raw.scheduledEnd ? new Date(raw.scheduledEnd) : null,
    durationMinutes:
      raw.durationMinutes === null || raw.durationMinutes === undefined
        ? null
        : Number(raw.durationMinutes),
    timezone: raw.timezone || base.timezone,
    availabilityTemplateId: raw.availabilityTemplateId || null,
    availability: {
      daysOfWeek: Array.isArray(raw.availability?.daysOfWeek)
        ? raw.availability.daysOfWeek.map(Number)
        : base.availability.daysOfWeek,
      startTime: raw.availability?.startTime || base.availability.startTime,
      endTime: raw.availability?.endTime || base.availability.endTime,
      excludePublicHolidays: Boolean(raw.availability?.excludePublicHolidays),
    },
    avoidConflicts:
      raw.avoidConflicts === undefined ? true : Boolean(raw.avoidConflicts),
  };
}
