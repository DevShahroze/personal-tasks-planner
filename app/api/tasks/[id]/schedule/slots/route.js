import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import Task from "@/models/Task";
import { prepareScheduleForSave } from "@/lib/scheduling/prepare";
import { loadBlockingIntervals } from "@/lib/scheduling/conflicts";
import { suggestFlexibleSlots } from "@/lib/scheduling/slots";
import { MAX_SLOT_LIMIT } from "@/lib/scheduling/constants";

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

  let limit = Number(parsed.body?.limit ?? 10);
  if (!Number.isFinite(limit) || limit < 1) {
    limit = 10;
  }
  limit = Math.min(limit, MAX_SLOT_LIMIT);

  await connectDB();
  const task = await Task.findById(id).lean();
  if (!task) {
    return jsonError("Task not found", 404);
  }

  const schedulePrepared = await prepareScheduleForSave({
    existingSchedule: task.schedule,
    bodySchedule: parsed.body?.schedule ?? {},
  });
  if (!schedulePrepared.ok) {
    return jsonError("Validation failed", 422, schedulePrepared.errors);
  }
  const schedule = schedulePrepared.schedule;

  if (schedule.mode !== "flexible") {
    return jsonError("Slot suggestions are only available for flexible tasks", 400);
  }

  const rangeStart = schedule.earliestDate || new Date();
  const rangeEnd = new Date(rangeStart.getTime() + 60 * 24 * 60 * 60 * 1000);

  const blockingIntervals = await loadBlockingIntervals({
    excludeTaskId: id,
    rangeStart,
    rangeEnd,
  });

  const result = suggestFlexibleSlots({
    schedule,
    blockingIntervals,
    limit,
  });

  if (!result.ok) {
    return jsonError(result.error, 400);
  }

  return jsonOk({
    slots: result.slots,
    message: result.message,
  });
}
