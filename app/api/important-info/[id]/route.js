import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateImportantInfoUpdate } from "@/lib/validations";
import ImportantInfo from "@/models/ImportantInfo";

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
  const record = await ImportantInfo.findById(id).lean();
  if (!record) {
    return jsonError("Record not found", 404);
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
  const body = parsed.body;

  const { errors, patch } = validateImportantInfoUpdate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const record = await ImportantInfo.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  }).lean();

  if (!record) {
    return jsonError("Record not found", 404);
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
  const record = await ImportantInfo.findByIdAndDelete(id);
  if (!record) {
    return jsonError("Record not found", 404);
  }

  return jsonOk({ ok: true });
}
