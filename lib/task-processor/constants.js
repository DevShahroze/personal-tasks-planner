import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants.js";

export const PROCESSOR_ROLLOVER_HOUR = 23;
export const PROCESSOR_BATCH_SIZE = 8;
export const PROCESSOR_STALE_MS = 15 * 60 * 1000;
export const PROCESSOR_MAX_CATCHUP_DAYS = 31;

export const ROLLOVER_OPEN_STATUSES = ["To Do", "In Progress"];

export function processorTimeZone() {
  return process.env.TASK_PROCESSOR_TIMEZONE?.trim() || DEFAULT_SCHEDULE_TIMEZONE;
}
