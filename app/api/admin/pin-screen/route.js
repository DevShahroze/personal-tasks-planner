import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import {
  loadPinScreenSettings,
  pinScreenPublicView,
  updatePinScreenSettings,
  verifyPinScreenPin,
} from "@/lib/admin/pin-screen";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const doc = await loadPinScreenSettings();
  return jsonOk(pinScreenPublicView(doc));
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

  const result = await updatePinScreenSettings(parsed.body || {});
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return jsonOk(result.settings);
}
