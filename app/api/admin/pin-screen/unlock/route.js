import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { verifyPinScreenPin } from "@/lib/admin/pin-screen";

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const pin = parsed.body?.pin;
  const result = await verifyPinScreenPin(pin);
  if (!result.ok) {
    return jsonError(result.error, 403);
  }

  return jsonOk({ ok: true });
}
