import { jsonError } from "@/lib/api-response.js";
import { assertTaskProcessorIdle } from "./lock.js";

export async function enforceProcessorIdleResponse() {
  const lock = await assertTaskProcessorIdle();
  if (!lock) {
    return null;
  }
  return jsonError(lock.message, 423);
}
