import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateTaskNoteCreate } from "@/lib/task-notes/validate";
import { assertTaskExists } from "@/lib/finance/task-link";
import TaskNote from "@/models/TaskNote";

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
  }

  await connectDB();
  const taskCheck = await assertTaskExists(id);
  if (!taskCheck.ok) {
    return jsonError(taskCheck.error, taskCheck.error === "Task not found" ? 404 : 400);
  }

  const items = await TaskNote.find({ taskId: id }).sort({ createdAt: -1 }).lean();

  return jsonOk({ items });
}

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateTaskNoteCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const taskCheck = await assertTaskExists(id);
  if (!taskCheck.ok) {
    return jsonError(taskCheck.error, taskCheck.error === "Task not found" ? 404 : 400);
  }

  const created = await TaskNote.create({
    taskId: id,
    content: validated.value.content,
  });

  return jsonOk(created.toObject(), 201);
}
