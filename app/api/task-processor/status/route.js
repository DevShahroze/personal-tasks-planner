import { connectDB } from "@/lib/mongodb.js";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { getProcessorStatus } from "@/lib/task-processor/run.js";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const status = await getProcessorStatus();
  return jsonOk(status);
}
