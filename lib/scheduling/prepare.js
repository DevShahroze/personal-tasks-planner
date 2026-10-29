import { mergeSchedulePatch, validateSchedule } from "./validate.js";
import { applyAvailabilityTemplateToSchedule } from "./resolve-template.js";
import { defaultSchedule } from "./defaults.js";

export async function prepareScheduleForSave({ existingSchedule, bodySchedule }) {
  if (bodySchedule === undefined) {
    return { ok: true, schedule: null };
  }

  const availabilityProvided = bodySchedule?.availability !== undefined;
  let merged = mergeSchedulePatch(existingSchedule || defaultSchedule(), bodySchedule);
  const templateResult = await applyAvailabilityTemplateToSchedule(merged, {
    availabilityProvided,
  });
  if (templateResult.error) {
    return { ok: false, errors: [templateResult.error] };
  }
  merged = templateResult.schedule;

  const validated = validateSchedule(merged);
  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
  }

  return { ok: true, schedule: validated.value };
}
