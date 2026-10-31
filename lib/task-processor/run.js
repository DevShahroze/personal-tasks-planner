import { connectDB } from "@/lib/mongodb.js";
import Task from "@/models/Task.js";
import TaskProcessorRun from "@/models/TaskProcessorRun.js";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants.js";
import {
  PROCESSOR_BATCH_SIZE,
  PROCESSOR_STALE_MS,
  ROLLOVER_OPEN_STATUSES,
  processorTimeZone,
} from "./constants.js";
import { businessDatesNeedingRuns, businessDatesForManualRun } from "./dates.js";
import { buildRolloverPatch, taskMatchesBusinessDate } from "./rollover-task.js";

function serializeRun(run) {
  const total = run.taskIds?.length || 0;
  const processed = run.processedTaskIds?.length || 0;
  const failed = run.failures?.length || 0;
  return {
    id: String(run._id),
    businessDateYmd: run.businessDateYmd,
    status: run.status,
    total,
    processed,
    failed,
    remaining: Math.max(0, total - processed - failed),
  };
}

export async function getLastCompletedBusinessYmd() {
  await connectDB();
  const doc = await TaskProcessorRun.findOne({ status: "completed" })
    .sort({ businessDateYmd: -1 })
    .lean();
  return doc?.businessDateYmd || null;
}

async function getLastCompletedRunSnapshot() {
  const doc = await TaskProcessorRun.findOne({ status: "completed" })
    .sort({ completedAt: -1 })
    .lean();
  if (!doc) {
    return null;
  }
  return {
    businessDateYmd: doc.businessDateYmd,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  };
}

export async function getActiveRun() {
  await connectDB();
  return TaskProcessorRun.findOne({
    status: { $in: ["pending", "running"] },
  })
    .sort({ businessDateYmd: 1 })
    .exec();
}

async function findCandidateTasks(businessDateYmd, tz) {
  const tasks = await Task.find(
    mergeWithTopLevelFilter({
      status: { $in: ROLLOVER_OPEN_STATUSES },
    }),
  ).lean();
  return tasks.filter((task) => taskMatchesBusinessDate(task, businessDateYmd, tz));
}

async function ensureRunForDate(businessDateYmd, tz) {
  let run = await TaskProcessorRun.findOne({ businessDateYmd });
  if (run?.status === "completed") {
    return null;
  }

  if (!run) {
    const tasks = await findCandidateTasks(businessDateYmd, tz);
    run = await TaskProcessorRun.create({
      businessDateYmd,
      timezone: tz,
      status: "pending",
      taskIds: tasks.map((task) => task._id),
      processedTaskIds: [],
      failures: [],
    });
  }

  if (!run.taskIds.length) {
    run.status = "completed";
    run.completedAt = new Date();
    await run.save();
    return null;
  }

  return run;
}

export async function getProcessorStatus(now = new Date()) {
  await connectDB();
  const tz = processorTimeZone();
  const lastCompleted = await getLastCompletedBusinessYmd();

  let activeRun = await getActiveRun();
  if (
    activeRun?.status === "running" &&
    activeRun.lastStepAt &&
    Date.now() - new Date(activeRun.lastStepAt).getTime() > PROCESSOR_STALE_MS
  ) {
    activeRun.status = "pending";
    await activeRun.save();
    activeRun = await getActiveRun();
  }

  const pendingBusinessDates = businessDatesNeedingRuns(lastCompleted, now, tz);
  const lastCompletedRun = await getLastCompletedRunSnapshot();
  const runSnapshot = activeRun ? serializeRun(activeRun) : null;
  const locked = Boolean(activeRun?.status === "running");
  const unfinishedRun =
    runSnapshot && runSnapshot.remaining > 0 && activeRun?.status !== "completed";
  const shouldRun = (pendingBusinessDates.length > 0 || unfinishedRun) && !locked;

  return {
    locked,
    pendingBusinessDates,
    run: runSnapshot,
    lastCompleted: lastCompletedRun,
    timezone: tz,
    shouldRun,
  };
}

export async function runProcessorStep() {
  await connectDB();
  const tz = processorTimeZone();
  const now = new Date();
  let status = await getProcessorStatus(now);

  if (status.locked) {
    return { ok: false, error: "Task processor is already running", status };
  }

  let run = await getActiveRun();
  if (!run) {
    if (!status.pendingBusinessDates.length) {
      return { ok: true, done: true, status };
    }
    run = await ensureRunForDate(status.pendingBusinessDates[0], tz);
    if (!run) {
      status = await getProcessorStatus(new Date());
      return { ok: true, done: !status.shouldRun, status };
    }
  }

  run.status = "running";
  run.startedAt = run.startedAt || now;
  run.lastStepAt = now;
  await run.save();

  const processedSet = new Set(run.processedTaskIds.map(String));
  const failedSet = new Set(run.failures.map((item) => String(item.taskId)));
  const remaining = run.taskIds.filter(
    (id) => !processedSet.has(String(id)) && !failedSet.has(String(id)),
  );

  const batch = remaining.slice(0, PROCESSOR_BATCH_SIZE);
  for (const taskId of batch) {
    try {
      const task = await Task.findById(taskId);
      if (!task || !ROLLOVER_OPEN_STATUSES.includes(task.status)) {
        run.processedTaskIds.push(taskId);
        continue;
      }
      if (!taskMatchesBusinessDate(task.toObject(), run.businessDateYmd, tz)) {
        run.processedTaskIds.push(taskId);
        continue;
      }
      const patch = buildRolloverPatch(task.toObject(), run.businessDateYmd);
      if (patch.taskDate) {
        task.taskDate = patch.taskDate;
      }
      if (patch.schedule) {
        task.schedule = patch.schedule;
        task.markModified("schedule");
      }
      await task.save();
      run.processedTaskIds.push(taskId);
    } catch (err) {
      run.failures.push({
        taskId,
        message: err.message || "Rollover failed",
      });
    }
  }

  run.lastStepAt = new Date();
  const finished =
    run.processedTaskIds.length + run.failures.length >= run.taskIds.length;
  if (finished) {
    run.status = "completed";
    run.completedAt = new Date();
  }
  await run.save();

  status = await getProcessorStatus(new Date());
  const done = !status.shouldRun && !status.run;

  return { ok: true, done, status };
}

export async function prepareManualProcessorRuns(now = new Date()) {
  await connectDB();
  const tz = processorTimeZone();
  let status = await getProcessorStatus(now);
  if (status.locked) {
    return { ok: false, error: "Task processor is already running", status };
  }

  const lastCompleted = await getLastCompletedBusinessYmd();
  const dates = businessDatesForManualRun(lastCompleted, now, tz);
  for (const ymd of dates) {
    await ensureRunForDate(ymd, tz);
  }

  status = await getProcessorStatus(now);
  return { ok: true, queuedDates: dates, status };
}

export async function getProcessorLockResponse() {
  const status = await getProcessorStatus();
  if (!status.locked) {
    return null;
  }
  const run = status.run;
  const progress = run
    ? `${run.processed} of ${run.total} tasks updated`
    : "in progress";
  return {
    message: `Daily task processor is running (${progress}). Please wait…`,
    status,
  };
}
