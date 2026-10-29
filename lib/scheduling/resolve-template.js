import AvailabilityTemplate from "@/models/AvailabilityTemplate";
import { isValidObjectId } from "@/lib/security/ids.js";
import { templateToAvailabilitySnapshot } from "./availability.js";

export async function applyAvailabilityTemplateToSchedule(
  schedule,
  { availabilityProvided },
) {
  if (!schedule.availabilityTemplateId) {
    return { schedule };
  }
  if (!isValidObjectId(String(schedule.availabilityTemplateId))) {
    return { error: "Invalid availability template id" };
  }
  const template = await AvailabilityTemplate.findById(
    schedule.availabilityTemplateId,
  ).lean();
  if (!template) {
    return { error: "Availability template not found" };
  }
  if (!availabilityProvided) {
    schedule.availability = templateToAvailabilitySnapshot(template);
  }
  if (!schedule.timezone) {
    schedule.timezone = template.timezone;
  }
  return { schedule };
}
