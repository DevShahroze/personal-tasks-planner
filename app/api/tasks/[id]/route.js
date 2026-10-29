import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import {
  jsonError,
  jsonOk,
  isValidObjectId,
  jsonIncompleteSubtasks,
} from "@/lib/api-response";
import { validateTaskUpdate } from "@/lib/validations";
import { validateContentBlocks } from "@/lib/content-blocks";
import { prepareScheduleForSave } from "@/lib/scheduling/prepare";
import {
  prepareRecurrenceForSave,
  validateRecurrence,
} from "@/lib/recurrence/validate";
import { applyRecurrenceCompletion } from "@/lib/recurrence/calculate";
import { normalizeRecurrence } from "@/lib/recurrence/defaults";
import { assertNoScheduleConflicts } from "@/lib/scheduling/conflicts";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import { readJsonBody } from "@/lib/security/request";
import { enforceProcessorIdleResponse } from "@/lib/task-processor/enforce-idle";
import { removeTaskReferences } from "@/lib/relationships";
import {
  assertValidParentTaskId,
  findIncompleteSubtasks,
  reopenParentIfNeeded,
} from "@/lib/subtasks/rules";
import Task from "@/models/Task";
import Category from "@/models/Category";

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
  const task = await Task.findById(id)
    .populate("category", "name")
    .populate("linkedThoughts", "title")
    .populate("linkedPlans", "title status")
    .lean();

  if (!task) {
    return jsonError("Task not found", 404);
  }

  return jsonOk(task);
}

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const processorBlock = await enforceProcessorIdleResponse();
  if (processorBlock) {
    return processorBlock;
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }
  const body = parsed.body;

  const { errors, patch } = validateTaskUpdate(body);
  if (errors.length) {
    return jsonError("Validation failed", 422, errors);
  }

  if (body.contentBlocks !== undefined) {
    const blocksResult = validateContentBlocks(body.contentBlocks);
    if (!blocksResult.ok) {
      return jsonError(blocksResult.error, 400);
    }
    patch.contentBlocks = blocksResult.value;
  }

  if (patch.category) {
    if (!mongoose.Types.ObjectId.isValid(patch.category)) {
      return jsonError("Invalid category", 400);
    }
    await connectDB();
    const cat = await Category.findById(patch.category);
    if (!cat) {
      return jsonError("Category not found", 404);
    }
  }

  await connectDB();
  const existing = await Task.findById(id);
  if (!existing) {
    return jsonError("Task not found", 404);
  }

  if (body.expectedUpdatedAt) {
    const expected = new Date(body.expectedUpdatedAt).getTime();
    const current = new Date(existing.updatedAt).getTime();
    if (expected !== current) {
      return jsonError("Task was updated elsewhere. Refresh and try again.", 409);
    }
  }

  if (body.schedule !== undefined) {
    const schedulePrepared = await prepareScheduleForSave({
      existingSchedule: existing.schedule,
      bodySchedule: body.schedule,
    });
    if (!schedulePrepared.ok) {
      return jsonError("Validation failed", 422, schedulePrepared.errors);
    }
    patch.schedule = schedulePrepared.schedule;

    const conflictResponse = await assertNoScheduleConflicts({
      excludeTaskId: id,
      schedule: patch.schedule,
    });
    if (conflictResponse) {
      return conflictResponse;
    }
  }

  const timeZone =
    patch.schedule?.timezone ||
    existing.schedule?.timezone ||
    DEFAULT_SCHEDULE_TIMEZONE;

  if (body.recurrence !== undefined) {
    const recurrencePrepared = await prepareRecurrenceForSave({
      existingRecurrence: existing.recurrence,
      bodyRecurrence: body.recurrence,
      timeZone,
    });
    if (!recurrencePrepared.ok) {
      return jsonError("Validation failed", 422, recurrencePrepared.errors);
    }
    patch.recurrence = recurrencePrepared.recurrence;
  }

  if (body.recordRecurrenceCompletion !== undefined) {
    const current = normalizeRecurrence(existing.recurrence);
    if (!current.enabled) {
      return jsonError("Recurrence is not enabled for this task", 400);
    }
    const applied = applyRecurrenceCompletion(
      current,
      body.recordRecurrenceCompletion,
      timeZone,
    );
    if (!applied.ok) {
      return jsonError(applied.error, 422);
    }
    const validated = validateRecurrence(applied.recurrence, timeZone);
    if (!validated.ok) {
      return jsonError("Validation failed", 422, validated.errors);
    }
    patch.recurrence = validated.value;
  }

  if (body.parentTaskId !== undefined) {
    return jsonError("Parent task cannot be changed from this endpoint", 400);
  }

  const previousStatus = existing.status;

  if (patch.status === "Completed" && !existing.parentTaskId) {
    const incomplete = await findIncompleteSubtasks(id);
    if (incomplete.length) {
      return jsonIncompleteSubtasks(
        incomplete.map((item) => ({
          id: String(item._id),
          title: item.title,
          status: item.status,
        })),
      );
    }
  }

  Object.assign(existing, patch);
  await existing.save();

  if (existing.parentTaskId && patch.status !== undefined) {
    await reopenParentIfNeeded(existing, previousStatus, existing.status);
  }

  const updated = await Task.findById(id)
    .populate("category", "name")
    .populate("linkedThoughts", "title")
    .populate("linkedPlans", "title status")
    .lean();

  return jsonOk(updated);
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const processorBlock = await enforceProcessorIdleResponse();
  if (processorBlock) {
    return processorBlock;
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
  }

  await connectDB();
  const task = await Task.findById(id);
  if (!task) {
    return jsonError("Task not found", 404);
  }

  const subtasks = await Task.find({ parentTaskId: id }, { _id: 1 });
  for (const subtask of subtasks) {
    await removeTaskReferences(subtask._id);
  }
  await Task.deleteMany({ parentTaskId: id });
  await removeTaskReferences(id);
  await Task.findByIdAndDelete(id);

  return jsonOk({ ok: true, deletedSubtasks: subtasks.length });
}
