import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateApplicationUpdate } from "@/lib/planning/validate";
import UniversityApplication from "@/models/UniversityApplication";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }
  await connectDB();
  const doc = await UniversityApplication.findById(id).lean();
  if (!doc) {
    return jsonError("Application not found", 404);
  }
  return jsonOk(doc);
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }
  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }
  const validated = validateApplicationUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  await connectDB();
  const doc = await UniversityApplication.findById(id);
  if (!doc) {
    return jsonError("Application not found", 404);
  }
  Object.assign(doc, validated.patch);
  await doc.save();
  return jsonOk(doc.toObject());
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }
  await connectDB();
  const deleted = await UniversityApplication.findByIdAndDelete(id);
  if (!deleted) {
    return jsonError("Application not found", 404);
  }
  return jsonOk({ ok: true });
}
