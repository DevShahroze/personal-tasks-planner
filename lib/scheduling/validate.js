import { SCHEDULE_MODES } from "./constants.js";
import { defaultSchedule, normalizeStoredSchedule } from "./defaults.js";
import {
  intervalRespectsDateBounds,
  intervalWithinAvailability,
} from "./availability.js";
import { isHolidayCalendarConfigured } from "./holidays.js";
import {
  isValidTimeZone,
  parseDateOnlyInput,
  parseHHmm,
  validateDaysOfWeek,
} from "./time.js";

function parseInstant(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDuration(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}

export function mergeSchedulePatch(existing, patch) {
  const base = normalizeStoredSchedule(existing);
  if (!patch || typeof patch !== "object") {
    return base;
  }
  const next = { ...base };
  if (patch.mode !== undefined) {
    next.mode = patch.mode;
  }
  if (patch.earliestDate !== undefined) {
    next.earliestDate = parseDateOnlyInput(patch.earliestDate);
  }
  if (patch.dueDate !== undefined) {
    next.dueDate = parseDateOnlyInput(patch.dueDate);
  }
  if (patch.scheduledStart !== undefined) {
    next.scheduledStart = parseInstant(patch.scheduledStart);
  }
  if (patch.scheduledEnd !== undefined) {
    next.scheduledEnd = parseInstant(patch.scheduledEnd);
  }
  if (patch.durationMinutes !== undefined) {
    next.durationMinutes = parseDuration(patch.durationMinutes);
  }
  if (patch.timezone !== undefined) {
    next.timezone = patch.timezone;
  }
  if (patch.availabilityTemplateId !== undefined) {
    next.availabilityTemplateId = patch.availabilityTemplateId || null;
  }
  if (patch.avoidConflicts !== undefined) {
    next.avoidConflicts = Boolean(patch.avoidConflicts);
  }
  if (patch.availability !== undefined && patch.availability !== null) {
    next.availability = {
      ...next.availability,
      ...patch.availability,
    };
    if (patch.availability.daysOfWeek !== undefined) {
      next.availability.daysOfWeek = patch.availability.daysOfWeek;
    }
  }
  return next;
}

export function validateSchedule(scheduleInput) {
  const errors = [];
  const schedule = normalizeStoredSchedule(scheduleInput);

  if (!SCHEDULE_MODES.includes(schedule.mode)) {
    errors.push("Invalid scheduling mode");
  }

  if (!isValidTimeZone(schedule.timezone)) {
    errors.push("Invalid timezone");
  }

  const daysResult = validateDaysOfWeek(schedule.availability.daysOfWeek);
  if (!daysResult.ok) {
    errors.push(daysResult.error);
  } else {
    schedule.availability.daysOfWeek = daysResult.value;
  }

  if (!parseHHmm(schedule.availability.startTime)) {
    errors.push("Invalid availability start time");
  }
  if (!parseHHmm(schedule.availability.endTime)) {
    errors.push("Invalid availability end time");
  }

  if (schedule.availability.excludePublicHolidays && !isHolidayCalendarConfigured()) {
    errors.push(
      "Public holiday exclusion is enabled but no holiday calendar is configured",
    );
  }

  if (schedule.earliestDate && schedule.dueDate) {
    if (schedule.earliestDate.getTime() > schedule.dueDate.getTime()) {
      errors.push("Earliest date cannot be after the deadline");
    }
  }

  if (schedule.mode === "flexible" && !schedule.durationMinutes) {
    errors.push("Flexible tasks require a duration in minutes");
  }

  if (schedule.mode === "unscheduled") {
    if (schedule.scheduledStart || schedule.scheduledEnd) {
      errors.push("Unscheduled tasks cannot have scheduled start or end times");
    }
  }

  if (schedule.mode === "flexible") {
    if (!schedule.durationMinutes) {
      errors.push("Flexible tasks require a duration in minutes");
    }
    if (schedule.scheduledStart || schedule.scheduledEnd) {
      if (!schedule.scheduledStart || !schedule.scheduledEnd) {
        errors.push("Flexible tasks need both scheduled start and end, or neither");
      } else if (schedule.scheduledEnd <= schedule.scheduledStart) {
        errors.push("Scheduled end must be after scheduled start");
      } else {
        const expectedEnd = new Date(
          schedule.scheduledStart.getTime() + schedule.durationMinutes * 60 * 1000,
        );
        if (expectedEnd.getTime() !== schedule.scheduledEnd.getTime()) {
          errors.push("Scheduled interval must match the configured duration");
        }
        if (
          !intervalRespectsDateBounds(
            schedule.scheduledStart,
            schedule.scheduledEnd,
            schedule,
          )
        ) {
          errors.push("Scheduled time is outside the allowed date range");
        }
        if (
          !intervalWithinAvailability(
            schedule.scheduledStart,
            schedule.scheduledEnd,
            schedule,
          )
        ) {
          errors.push("Scheduled time is outside permitted availability hours");
        }
      }
    }
  }

  if (schedule.mode === "fixed") {
    if (!schedule.scheduledStart || !schedule.scheduledEnd) {
      errors.push("Fixed tasks require scheduled start and end times");
    } else if (schedule.scheduledEnd <= schedule.scheduledStart) {
      errors.push("Scheduled end must be after scheduled start");
    } else {
      if (
        !intervalRespectsDateBounds(
          schedule.scheduledStart,
          schedule.scheduledEnd,
          schedule,
        )
      ) {
        errors.push("Scheduled time is outside the allowed date range");
      }
      if (
        !intervalWithinAvailability(
          schedule.scheduledStart,
          schedule.scheduledEnd,
          schedule,
        )
      ) {
        errors.push("Scheduled time is outside permitted availability hours");
      }
      if (schedule.durationMinutes) {
        const expectedEnd = new Date(
          schedule.scheduledStart.getTime() + schedule.durationMinutes * 60 * 1000,
        );
        if (expectedEnd.getTime() !== schedule.scheduledEnd.getTime()) {
          errors.push("Scheduled interval must match the configured duration");
        }
      }
    }
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return { ok: true, errors: [], value: schedule };
}

export function scheduleForCreate(body) {
  if (body?.schedule === undefined || body?.schedule === null) {
    return validateSchedule(defaultSchedule());
  }
  return validateSchedule(mergeSchedulePatch(defaultSchedule(), body.schedule));
}
