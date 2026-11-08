import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateSequenceTimerSave } from "@/lib/sequence-timer/validate";
import {
  loadSequenceTimer,
  saveSequenceTimer,
  sequenceTimerPublicView,
} from "@/lib/sequence-timer/state";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const doc = await loadSequenceTimer();
  return jsonOk(sequenceTimerPublicView(doc));
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

  const validated = validateSequenceTimerSave(parsed.body || {});
  if (!validated.ok) {
    return jsonError(validated.error, 400);
  }

  const doc = await saveSequenceTimer(validated.data);
  return jsonOk(sequenceTimerPublicView(doc));
}
