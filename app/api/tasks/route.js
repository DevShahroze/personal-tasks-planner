import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { parsePagination, parseTaskSort, validateTaskCreate } from "@/lib/validations";
import { prepareScheduleForSave } from "@/lib/scheduling/prepare";
import { prepareRecurrenceForSave } from "@/lib/recurrence/validate";
import { assertNoScheduleConflicts } from "@/lib/scheduling/conflicts";
import { alignTaskDateAndSchedule } from "@/lib/scheduling/align-task-date";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import { buildTaskListFilter } from "@/lib/security/task-filters";
import { readJsonBody } from "@/lib/security/request";
import { enforceProcessorIdleResponse } from "@/lib/task-processor/enforce-idle";
import Task from "@/models/Task";
import Category from "@/models/Category";
import mongoose from "mongoose";

const listProjection = {
  title: 1,
  description: 1,
  status: 1,
  priority: 1,
  category: 1,
  taskDate: 1,
  timelineStart: 1,
  timelineEnd: 1,
  "schedule.mode": 1,
  "schedule.scheduledStart": 1,
  "schedule.scheduledEnd": 1,
  updatedAt: 1,
  createdAt: 1,
};

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const filter = buildTaskListFilter(searchParams);
  const sort = parseTaskSort(searchParams);

  const [items, total] = await Promise.all([
    Task.find(filter, listProjection)
      .populate("category", "name")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return jsonOk({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const processorBlock = await enforceProcessorIdleResponse();
  if (processorBlock) {
    return processorBlock;
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const { errors, value } = validateTaskCreate(parsed.body);
  if (errors.length) {
    return jsonError("Validation failed", 422, errors);
  }

  if (value.category) {
    if (!mongoose.Types.ObjectId.isValid(value.category)) {
      return jsonError("Invalid category", 400);
    }
    await connectDB();
    const cat = await Category.findById(value.category);
    if (!cat) {
      return jsonError("Category not found", 404);
    }
  }

  await connectDB();
  if (parsed.body?.schedule !== undefined) {
    const schedulePrepared = await prepareScheduleForSave({
      existingSchedule: value.schedule,
      bodySchedule: parsed.body.schedule,
    });
    if (!schedulePrepared.ok) {
      return jsonError("Validation failed", 422, schedulePrepared.errors);
    }
    value.schedule = schedulePrepared.schedule;
  }

  if (parsed.body?.recurrence !== undefined) {
    const recurrencePrepared = await prepareRecurrenceForSave({
      existingRecurrence: value.recurrence,
      bodyRecurrence: parsed.body.recurrence,
      timeZone: value.schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE,
    });
    if (!recurrencePrepared.ok) {
      return jsonError("Validation failed", 422, recurrencePrepared.errors);
    }
    value.recurrence = recurrencePrepared.recurrence;
  }

  const conflictResponse = await assertNoScheduleConflicts({
    schedule: value.schedule,
  });
  if (conflictResponse) {
    return conflictResponse;
  }

  if (value.taskDate && value.schedule) {
    const aligned = alignTaskDateAndSchedule(value.taskDate, value.schedule);
    value.taskDate = aligned.taskDate;
    value.schedule = aligned.schedule;
  }

  const task = await Task.create(value);
  const populated = await Task.findById(task._id).populate("category", "name").lean();

  return jsonOk(populated, 201);
}
