import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateSubtaskCreate } from "@/lib/subtasks/validate";
import { assertValidParentTaskId } from "@/lib/subtasks/rules";
import { subtaskSummary } from "@/lib/subtasks/constants";
import Task from "@/models/Task";

const subtaskProjection = {
  title: 1,
  status: 1,
  priority: 1,
  parentTaskId: 1,
  updatedAt: 1,
  createdAt: 1,
};

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
  const parent = await Task.findById(id, { parentTaskId: 1 }).lean();
  if (!parent) {
    return jsonError("Task not found", 404);
  }
  if (parent.parentTaskId) {
    return jsonError("Subtasks cannot have nested subtasks", 400);
  }

  const items = await Task.find({ parentTaskId: id }, subtaskProjection)
    .sort({ createdAt: 1 })
    .lean();

  return jsonOk({
    items,
    summary: subtaskSummary(items),
  });
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

  const validated = validateSubtaskCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const parentCheck = await assertValidParentTaskId(id);
  if (!parentCheck.ok) {
    return jsonError(parentCheck.error, 400);
  }

  const created = await Task.create({
    ...validated.value,
    parentTaskId: id,
    category: parentCheck.parent?.category || null,
  });

  return jsonOk(created.toObject(), 201);
}
