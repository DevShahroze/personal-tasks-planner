import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";

export const PROCESSOR_BATCH_SIZE = 8;
/** Reset a stuck `running` batch so another step can continue (not 15m task-processor stale). */
export const PROCESSOR_RUNNING_STALE_MS = 2 * 60 * 1000;
export const PROCESSOR_STALE_MS = 15 * 60 * 1000;
export const PROCESSOR_MAX_CATCHUP_DAYS = 31;

export { DEFAULT_ROLLOVER_STATUSES as ROLLOVER_OPEN_STATUSES } from "./rollover-defaults.js";

export function processorTimeZone() {
  return process.env.TASK_PROCESSOR_TIMEZONE?.trim() || DEFAULT_SCHEDULE_TIMEZONE;
}
