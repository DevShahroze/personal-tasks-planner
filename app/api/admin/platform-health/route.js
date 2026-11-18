import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { jsonError, jsonOk } from "@/lib/api-response";
import { collectPlatformHealth } from "@/lib/platform-health/collect";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const report = await collectPlatformHealth();
  return jsonOk(report);
}
