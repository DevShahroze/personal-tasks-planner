import { TASK_STATUSES } from "../constants.js";
import { loadAppSettings } from "./app-settings.js";
import {
  normalizeRolloverStatusesInput,
  rolloverStatusesFromDoc,
} from "../task-processor/rollover-statuses.js";

export function taskRolloverPublicView(doc) {
  return {
    statuses: rolloverStatusesFromDoc(doc),
    availableStatuses: [...TASK_STATUSES],
  };
}

export async function updateTaskRolloverSettings(body) {
  const password = body.password;
  if (!password || typeof password !== "string") {
    return { ok: false, status: 400, error: "Password is required" };
  }
  const passwordOk = await verifyAppPassword(password);
  if (!passwordOk) {
    return { ok: false, status: 401, error: "Invalid password" };
  }

  const statuses = normalizeRolloverStatusesInput(body.statuses);
  if (!statuses) {
    return { ok: false, status: 422, error: "Select at least one task status" };
  }

  const updated = await AppSettings.findByIdAndUpdate(
    APP_SETTINGS_ID,
    { $set: { rolloverStatuses: statuses } },
    { new: true, upsert: true },
  ).lean();

  return { ok: true, settings: taskRolloverPublicView(updated) };
}
