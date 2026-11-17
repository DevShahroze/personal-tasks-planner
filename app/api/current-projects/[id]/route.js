import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateCurrentProjectUpdate } from "@/lib/current-projects/validate";
import CurrentProject from "@/models/CurrentProject";

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
  const record = await CurrentProject.findById(id).lean();
  if (!record) {
    return jsonError("Project not found", 404);
  }

  return jsonOk(record);
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

  const validated = validateCurrentProjectUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const record = await CurrentProject.findByIdAndUpdate(id, validated.patch, {
    new: true,
    runValidators: true,
  }).lean();

  if (!record) {
    return jsonError("Project not found", 404);
  }

  return jsonOk(record);
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
  const record = await CurrentProject.findByIdAndDelete(id);
  if (!record) {
    return jsonError("Project not found", 404);
  }

  return jsonOk({ ok: true });
}
