import Task from "@/models/Task";
import { BLOCKING_TASK_STATUSES } from "./constants.js";
import { jsonSchedulingConflict } from "@/lib/api-response";

const conflictProjection = {
  title: 1,
  "schedule.scheduledStart": 1,
  "schedule.scheduledEnd": 1,
};

export function hasScheduledInterval(schedule) {
  return Boolean(
    schedule?.scheduledStart &&
    schedule?.scheduledEnd &&
    schedule.scheduledEnd > schedule.scheduledStart,
  );
}

export async function findScheduleConflicts({ excludeTaskId, start, end }) {
  const filter = {
    status: { $nin: BLOCKING_TASK_STATUSES },
    "schedule.scheduledStart": { $ne: null, $lt: end },
    "schedule.scheduledEnd": { $ne: null, $gt: start },
  };

  if (excludeTaskId) {
    filter._id = { $ne: excludeTaskId };
  }

  const tasks = await Task.find(filter, conflictProjection).lean();
  return tasks.map((task) => ({
    id: String(task._id),
    title: task.title,
    scheduledStart: task.schedule.scheduledStart,
    scheduledEnd: task.schedule.scheduledEnd,
  }));
}

export async function loadBlockingIntervals({ excludeTaskId, rangeStart, rangeEnd }) {
  const filter = {
    status: { $nin: BLOCKING_TASK_STATUSES },
    "schedule.scheduledStart": { $ne: null, $lt: rangeEnd },
    "schedule.scheduledEnd": { $ne: null, $gt: rangeStart },
  };
  if (excludeTaskId) {
    filter._id = { $ne: excludeTaskId };
  }
  const tasks = await Task.find(filter, {
    "schedule.scheduledStart": 1,
    "schedule.scheduledEnd": 1,
  }).lean();
  return tasks.map((task) => ({
    start: task.schedule.scheduledStart,
    end: task.schedule.scheduledEnd,
  }));
}

export async function assertNoScheduleConflicts({ excludeTaskId, schedule }) {
  if (!schedule.avoidConflicts || !hasScheduledInterval(schedule)) {
    return null;
  }
  const conflicts = await findScheduleConflicts({
    excludeTaskId,
    start: schedule.scheduledStart,
    end: schedule.scheduledEnd,
  });
  if (!conflicts.length) {
    return null;
  }
  return jsonSchedulingConflict(conflicts);
}
