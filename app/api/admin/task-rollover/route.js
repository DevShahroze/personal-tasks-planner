import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { loadAppSettings } from "@/lib/admin/app-settings";
import {
  taskRolloverPublicView,
  updateTaskRolloverSettings,
} from "@/lib/admin/task-rollover";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const doc = await loadAppSettings();
  return jsonOk(taskRolloverPublicView(doc));
}

export async function PUT(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const result = await updateTaskRolloverSettings(parsed.body || {});
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonOk(result.settings);
}
