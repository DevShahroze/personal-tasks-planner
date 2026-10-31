import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateKametiUpdate } from "@/lib/planning/validate";
import { syncKametiPlan } from "@/lib/planning/kameti";
import KametiPlan from "@/models/KametiPlan";

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
  const doc = await KametiPlan.findById(id);
  if (!doc) {
    return jsonError("Kameti plan not found", 404);
  }
  const todayYmd =
    new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);
  syncKametiPlan(doc, todayYmd);
  if (doc.isModified()) {
    await doc.save();
  }
  return jsonOk(doc.toObject());
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
  await connectDB();
  const doc = await KametiPlan.findById(id);
  if (!doc) {
    return jsonError("Kameti plan not found", 404);
  }
  const validated = validateKametiUpdate(parsed.body, doc.toObject());
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  Object.assign(doc, validated.patch);
  syncKametiPlan(doc, new Date().toISOString().slice(0, 10));
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
  const deleted = await KametiPlan.findByIdAndDelete(id);
  if (!deleted) {
    return jsonError("Kameti plan not found", 404);
  }
  return jsonOk({ ok: true });
}
