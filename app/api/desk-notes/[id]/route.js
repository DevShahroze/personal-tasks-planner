import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateDeskNoteUpdate } from "@/lib/desk-notes/validate";
import DeskNote from "@/models/DeskNote";

export async function GET(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid note id", 400);
  }

  await connectDB();
  const note = await DeskNote.findById(id).lean();
  if (!note) {
    return jsonError("Note not found", 404);
  }

  return jsonOk(note);
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid note id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const { errors, patch } = validateDeskNoteUpdate(parsed.body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }
  if (!Object.keys(patch).length) {
    return jsonError("No changes", 400);
  }

  await connectDB();
  const note = await DeskNote.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  }).lean();

  if (!note) {
    return jsonError("Note not found", 404);
  }

  return jsonOk(note);
}

export async function DELETE(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid note id", 400);
  }

  await connectDB();
  const deleted = await DeskNote.findByIdAndDelete(id).lean();
  if (!deleted) {
    return jsonError("Note not found", 404);
  }

  return jsonOk({ ok: true });
}
