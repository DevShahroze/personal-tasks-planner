import { TASK_STATUSES } from "../constants.js";
import { applyRecurrenceCompletion, ymdToUtcDate } from "./calculate.js";
import { normalizeRecurrence } from "./defaults.js";
import { validateRecurrence } from "./validate.js";

const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeOccurrenceStatuses(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(
      (item) =>
        item &&
        typeof item.ymd === "string" &&
        YMD_PATTERN.test(item.ymd) &&
        TASK_STATUSES.includes(item.status),
    )
    .map((item) => ({ ymd: item.ymd, status: item.status }));
}

export function getRecurrenceOccurrenceStatus(recurrence, ymd) {
  if (!ymd || !recurrence?.enabled) {
    return null;
  }
  const hit = normalizeOccurrenceStatuses(recurrence.occurrenceStatuses).find(
    (item) => item.ymd === ymd,
  );
  return hit ? hit.status : "To Do";
}

export function upsertRecurrenceOccurrenceStatus(recurrence, ymd, status) {
  const list = normalizeOccurrenceStatuses(recurrence.occurrenceStatuses).filter(
    (item) => item.ymd !== ymd,
  );
  if (status !== "To Do") {
    list.push({ ymd, status });
  }
  list.sort((a, b) => a.ymd.localeCompare(b.ymd));
  return { ...recurrence, occurrenceStatuses: list };
}

export function applySetRecurrenceOccurrenceStatus(
  existingRecurrence,
  input,
  timeZone,
) {
  const ymd = typeof input?.ymd === "string" ? input.ymd.trim() : "";
  const status = input?.status;
  if (!YMD_PATTERN.test(ymd)) {
    return { ok: false, error: "Invalid occurrence date" };
  }
  if (!TASK_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  let recurrence = normalizeRecurrence(existingRecurrence);
  if (!recurrence.enabled) {
    return { ok: false, error: "Recurrence is not enabled for this task" };
  }

  recurrence = upsertRecurrenceOccurrenceStatus(recurrence, ymd, status);

  if (status === "Completed") {
    const completedDate = ymdToUtcDate(ymd, timeZone);
    const applied = applyRecurrenceCompletion(recurrence, { completedDate }, timeZone);
    if (!applied.ok) {
      return applied;
    }
    recurrence = upsertRecurrenceOccurrenceStatus(applied.recurrence, ymd, "Completed");
  }

  const validated = validateRecurrence(recurrence, timeZone);
  if (!validated.ok) {
    return { ok: false, error: validated.errors.join(", ") };
  }

  return { ok: true, recurrence: validated.value };
}
