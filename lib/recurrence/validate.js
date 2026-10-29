import { RECURRENCE_UNITS, PROCEDURE_STATUSES } from "./constants.js";
import { defaultRecurrence, normalizeRecurrence } from "./defaults.js";
import { calculateNextDueDate } from "./calculate.js";
import { parseDateOnlyInput } from "../scheduling/time.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";

const MAX_PROCEDURE_DETAILS = 2000;

function parseOptionalDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = parseDateOnlyInput(value);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function mergeRecurrencePatch(existing, patch) {
  const base = normalizeRecurrence(existing);
  if (!patch || typeof patch !== "object") {
    return base;
  }

  const next = { ...base };
  if (patch.enabled !== undefined) {
    next.enabled = Boolean(patch.enabled);
  }
  if (patch.interval !== undefined) {
    next.interval = Number(patch.interval);
  }
  if (patch.unit !== undefined) {
    next.unit = patch.unit;
  }
  if (patch.lastCompletedDate !== undefined) {
    next.lastCompletedDate = parseOptionalDate(patch.lastCompletedDate);
  }
  if (patch.endDate !== undefined) {
    next.endDate = parseOptionalDate(patch.endDate);
  }
  if (patch.lastProcedureDate !== undefined) {
    next.lastProcedureDate = parseOptionalDate(patch.lastProcedureDate);
  }
  if (patch.procedureStatus !== undefined) {
    next.procedureStatus = patch.procedureStatus;
  }
  if (patch.procedureDetails !== undefined) {
    next.procedureDetails =
      typeof patch.procedureDetails === "string"
        ? patch.procedureDetails.slice(0, MAX_PROCEDURE_DETAILS)
        : "";
  }
  if (patch.nextAppointmentDate !== undefined) {
    next.nextAppointmentDate = parseOptionalDate(patch.nextAppointmentDate);
  }
  return next;
}

export function validateRecurrence(
  recurrenceInput,
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
) {
  const errors = [];
  const recurrence = normalizeRecurrence(recurrenceInput);

  if (recurrence.enabled) {
    if (!Number.isFinite(recurrence.interval) || recurrence.interval < 1) {
      errors.push("Recurrence interval must be a positive number");
    }
    if (!RECURRENCE_UNITS.includes(recurrence.unit)) {
      errors.push("Invalid recurrence unit");
    }
  }

  if (!PROCEDURE_STATUSES.includes(recurrence.procedureStatus)) {
    errors.push("Invalid procedure status");
  }

  if (recurrence.endDate && recurrence.lastCompletedDate) {
    if (recurrence.lastCompletedDate.getTime() > recurrence.endDate.getTime()) {
      errors.push("Last completed date cannot be after recurrence end date");
    }
  }

  if (recurrence.nextAppointmentDate && recurrence.procedureStatus === "undecided") {
    errors.push("Set procedure status to decided before booking an appointment date");
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  const { nextDueDate } = calculateNextDueDate(recurrence, timeZone);
  recurrence.nextDueDate = nextDueDate;

  return { ok: true, errors: [], value: recurrence };
}

export function recurrenceForCreate(body, timeZone) {
  if (body?.recurrence === undefined || body?.recurrence === null) {
    return validateRecurrence(defaultRecurrence(), timeZone);
  }
  return validateRecurrence(
    mergeRecurrencePatch(defaultRecurrence(), body.recurrence),
    timeZone,
  );
}

export function prepareRecurrenceForSave({
  existingRecurrence,
  bodyRecurrence,
  timeZone,
}) {
  if (bodyRecurrence === undefined) {
    return { ok: true, recurrence: null };
  }
  const merged = mergeRecurrencePatch(
    existingRecurrence || defaultRecurrence(),
    bodyRecurrence,
  );
  return validateRecurrence(merged, timeZone);
}
