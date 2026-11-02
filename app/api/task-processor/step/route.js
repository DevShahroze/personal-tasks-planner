import { connectDB } from "@/lib/mongodb.js";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { runProcessorStep } from "@/lib/task-processor/run.js";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  let executionType = "automatic";
  try {
    const body = await request.json();
    if (body?.executionType === "manual") {
      executionType = "manual";
    }
  } catch {
    // empty body is fine for automatic runs
  }

  await connectDB();
  const result = await runProcessorStep({ executionType });
  if (!result.ok) {
    return jsonError(result.error, 409, undefined);
  }
  return jsonOk(result);
}
