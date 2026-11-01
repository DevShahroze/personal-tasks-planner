import { TASK_STATUSES } from "../constants.js";
import { loadAppSettings } from "../admin/app-settings.js";
import { DEFAULT_ROLLOVER_STATUSES } from "./rollover-defaults.js";

export function rolloverStatusesFromDoc(doc) {
  const raw = doc?.rolloverStatuses;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_ROLLOVER_STATUSES];
  }
  const allowed = new Set(TASK_STATUSES);
  const picked = raw.filter((status) => allowed.has(status));
  return picked.length > 0 ? picked : [...DEFAULT_ROLLOVER_STATUSES];
}

export function normalizeRolloverStatusesInput(input) {
  if (!Array.isArray(input)) {
    return null;
  }
  const allowed = new Set(TASK_STATUSES);
  const picked = [
    ...new Set(
      input.filter((status) => typeof status === "string" && allowed.has(status)),
    ),
  ];
  if (picked.length === 0) {
    return null;
  }
  return picked;
}

export async function getRolloverStatuses() {
  const doc = await loadAppSettings();
  return rolloverStatusesFromDoc(doc);
}
