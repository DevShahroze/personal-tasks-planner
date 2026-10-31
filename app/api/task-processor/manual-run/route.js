import { connectDB } from "@/lib/mongodb.js";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { prepareManualProcessorRuns } from "@/lib/task-processor/run.js";

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const result = await prepareManualProcessorRuns();
  if (!result.ok) {
    return jsonError(result.error, 409);
  }
  return jsonOk(result);
}
