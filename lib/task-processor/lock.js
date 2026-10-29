import { getProcessorLockResponse } from "./run.js";

export async function assertTaskProcessorIdle() {
  return getProcessorLockResponse();
}
