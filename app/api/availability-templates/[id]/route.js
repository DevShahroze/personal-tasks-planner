import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateAvailabilityTemplateInput } from "@/lib/scheduling/template-validate";
import AvailabilityTemplate from "@/models/AvailabilityTemplate";

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid template id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateAvailabilityTemplateInput(parsed.body, { partial: true });
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const updated = await AvailabilityTemplate.findByIdAndUpdate(id, validated.value, {
    new: true,
    runValidators: true,
  }).lean();

  if (!updated) {
    return jsonError("Template not found", 404);
  }

  return jsonOk(updated);
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid template id", 400);
  }

  await connectDB();
  const removed = await AvailabilityTemplate.findByIdAndDelete(id).lean();
  if (!removed) {
    return jsonError("Template not found", 404);
  }

  return jsonOk({ ok: true });
}
