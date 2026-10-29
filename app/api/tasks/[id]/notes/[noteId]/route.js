import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateTaskNoteUpdate } from "@/lib/task-notes/validate";
import TaskNote from "@/models/TaskNote";

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id, noteId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(noteId)) {
    return jsonError("Invalid id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateTaskNoteUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const note = await TaskNote.findOne({ _id: noteId, taskId: id });
  if (!note) {
    return jsonError("Note not found", 404);
  }

  Object.assign(note, validated.patch);
  await note.save();

  return jsonOk(note.toObject());
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id, noteId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(noteId)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  const deleted = await TaskNote.findOneAndDelete({ _id: noteId, taskId: id });
  if (!deleted) {
    return jsonError("Note not found", 404);
  }

  return jsonOk({ ok: true });
}
