import { ISO_WEEKDAYS, DEFAULT_SCHEDULE_TIMEZONE } from "./constants.js";
import { isValidTimeZone, parseHHmm, validateDaysOfWeek } from "./time.js";
import { isHolidayCalendarConfigured } from "./holidays.js";

export function validateAvailabilityTemplateInput(body, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      errors.push("Name is required");
    } else {
      value.name = name;
    }
  }

  if (body.daysOfWeek !== undefined) {
    const daysResult = validateDaysOfWeek(body.daysOfWeek || []);
    if (!daysResult.ok) {
      errors.push(daysResult.error);
    } else {
      value.daysOfWeek = daysResult.value;
    }
  } else if (!partial) {
    const daysResult = validateDaysOfWeek([...ISO_WEEKDAYS]);
    value.daysOfWeek = daysResult.value;
  }

  if (body.startTime !== undefined) {
    if (!parseHHmm(body.startTime || "")) {
      errors.push("Invalid start time");
    } else {
      value.startTime = body.startTime;
    }
  } else if (!partial) {
    value.startTime = "00:00";
  }

  if (body.endTime !== undefined) {
    if (!parseHHmm(body.endTime || "")) {
      errors.push("Invalid end time");
    } else {
      value.endTime = body.endTime;
    }
  } else if (!partial) {
    value.endTime = "23:59";
  }

  if (body.timezone !== undefined) {
    const tz = body.timezone || DEFAULT_SCHEDULE_TIMEZONE;
    if (!isValidTimeZone(tz)) {
      errors.push("Invalid timezone");
    } else {
      value.timezone = tz;
    }
  } else if (!partial) {
    value.timezone = DEFAULT_SCHEDULE_TIMEZONE;
  }

  if (body.excludePublicHolidays !== undefined) {
    value.excludePublicHolidays = Boolean(body.excludePublicHolidays);
    if (value.excludePublicHolidays && !isHolidayCalendarConfigured()) {
      errors.push(
        "Public holiday exclusion is enabled but no holiday calendar is configured",
      );
    }
  } else if (!partial) {
    value.excludePublicHolidays = false;
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value };
}
