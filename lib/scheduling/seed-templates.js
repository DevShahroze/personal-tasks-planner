import AvailabilityTemplate from "@/models/AvailabilityTemplate";
import { DEFAULT_SCHEDULE_TIMEZONE } from "./constants.js";

export const SYSTEM_AVAILABILITY_TEMPLATES = [
  {
    name: "Anytime",
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startTime: "00:00",
    endTime: "23:59",
    timezone: DEFAULT_SCHEDULE_TIMEZONE,
    excludePublicHolidays: false,
  },
  {
    name: "Weekdays",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "00:00",
    endTime: "23:59",
    timezone: DEFAULT_SCHEDULE_TIMEZONE,
    excludePublicHolidays: false,
  },
  {
    name: "Business Hours",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    timezone: DEFAULT_SCHEDULE_TIMEZONE,
    excludePublicHolidays: false,
  },
];

export async function ensureDefaultAvailabilityTemplates() {
  const count = await AvailabilityTemplate.countDocuments();
  if (count > 0) {
    return;
  }
  await AvailabilityTemplate.insertMany(SYSTEM_AVAILABILITY_TEMPLATES);
}
