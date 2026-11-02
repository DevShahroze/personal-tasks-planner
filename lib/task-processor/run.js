import { connectDB } from "@/lib/mongodb.js";
import Task from "@/models/Task.js";
import TaskProcessorRun from "@/models/TaskProcessorRun.js";
import {
  PROCESSOR_BATCH_SIZE,
  PROCESSOR_STALE_MS,
  processorTimeZone,
} from "./constants.js";
import {
  businessDatesNeedingRuns,
  businessDatesForManualRun,
  compareYmd,
} from "./dates.js";
import { buildRolloverPatch, taskMatchesBusinessDate } from "./rollover-task.js";
import { getRolloverStatuses } from "./rollover-statuses.js";
import {
  pendingBusinessDatesFromTasks,
  summarizeRolloverTaskScan,
  taskShouldRollNow,
} from "./eligibility.js";
import { loadTopLevelTasksForRollover } from "./load-tasks.js";

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

function mergePendingBusinessDates(scheduled, fromTasks) {
  const merged = [...new Set([...scheduled, ...fromTasks])];
  merged.sort(compareYmd);
  return merged;
}

async function findCandidateTasks(
  businessDateYmd,
  now,
  tz,
  rolloverStatuses,
  options = {},
) {
  const tasks = await loadTopLevelTasksForRollover(rolloverStatuses);
  return tasks.filter(
    (task) =>
      taskShouldRollNow(task, now, tz, rolloverStatuses, options) &&
      taskMatchesBusinessDate(task, businessDateYmd, tz),
  );
}

async function ensureRunForDate(
  businessDateYmd,
  now,
  tz,
  rolloverStatuses,
  options = {},
) {
  let run = await TaskProcessorRun.findOne({ businessDateYmd });
  const candidates = await findCandidateTasks(
    businessDateYmd,
    now,
    tz,
    rolloverStatuses,
    options,
  );

  if (run?.status === "completed") {
    if (!candidates.length) {
      return null;
    }
    run.status = "pending";
    run.taskIds = candidates.map((task) => task._id);
    run.processedTaskIds = [];
    run.failures = [];
    run.completedAt = null;
    run.startedAt = null;
    await run.save();
    return run;
  }

  if (!run) {
    if (!candidates.length) {
      return null;
    }
    run = await TaskProcessorRun.create({
      businessDateYmd,
      timezone: tz,
      status: "pending",
      taskIds: candidates.map((task) => task._id),
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

async function buildProcessorStatus(now, tz, rolloverStatuses, options = {}) {
  const lastCompleted = await getLastCompletedBusinessYmd();
  const tasks = await loadTopLevelTasksForRollover(rolloverStatuses);
  const scheduled = businessDatesNeedingRuns(lastCompleted, now, tz);
  const fromTasks = pendingBusinessDatesFromTasks(
    tasks,
    now,
    tz,
    rolloverStatuses,
    options,
  );
  const pendingBusinessDates = mergePendingBusinessDates(scheduled, fromTasks);
  const rolloverScan = summarizeRolloverTaskScan(
    tasks,
    now,
    tz,
    rolloverStatuses,
    options,
  );

  return {
    pendingBusinessDates,
    rolloverScan,
    lastCompleted,
  };
}

async function healActiveRun(activeRun) {
  if (!activeRun) {
    return null;
  }
  const total = activeRun.taskIds?.length || 0;
  const processed = activeRun.processedTaskIds?.length || 0;
  const failed = activeRun.failures?.length || 0;
  if (total === 0 || processed + failed >= total) {
    activeRun.status = "completed";
    activeRun.completedAt = activeRun.completedAt || new Date();
    await activeRun.save();
    return null;
  }
  return activeRun;
}

export async function getProcessorStatus(now = new Date()) {
  await connectDB();
  const tz = processorTimeZone();
  const rolloverStatuses = await getRolloverStatuses();

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
  activeRun = await healActiveRun(activeRun);

  const built = await buildProcessorStatus(now, tz, rolloverStatuses);
  const lastCompletedRun = await getLastCompletedRunSnapshot();
  const runSnapshot = activeRun ? serializeRun(activeRun) : null;
  const locked = Boolean(activeRun?.status === "running");
  const unfinishedRun =
    runSnapshot && runSnapshot.remaining > 0 && activeRun?.status !== "completed";
  const shouldRun =
    (built.pendingBusinessDates.length > 0 ||
      built.rolloverScan.toRoll > 0 ||
      unfinishedRun) &&
    !locked;

  return {
    locked,
    pendingBusinessDates: built.pendingBusinessDates,
    rolloverScan: built.rolloverScan,
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
  const rolloverStatuses = await getRolloverStatuses();
  let status = await getProcessorStatus(now);

  if (status.locked) {
    return { ok: false, error: "Task processor is already running", status };
  }

  let run = await getActiveRun();
  if (!run) {
    if (!status.pendingBusinessDates.length) {
      return { ok: true, done: true, status };
    }
    run = await ensureRunForDate(
      status.pendingBusinessDates[0],
      now,
      tz,
      rolloverStatuses,
    );
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
      if (!task || !rolloverStatuses.includes(task.status)) {
        run.processedTaskIds.push(taskId);
        continue;
      }
      if (!taskMatchesBusinessDate(task.toObject(), run.businessDateYmd, tz)) {
        run.processedTaskIds.push(taskId);
        continue;
      }
      if (!taskShouldRollNow(task.toObject(), now, tz, rolloverStatuses)) {
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
  const rolloverStatuses = await getRolloverStatuses();
  let status = await getProcessorStatus(now);
  if (status.locked) {
    return { ok: false, error: "Task processor is already running", status };
  }

  const lastCompleted = await getLastCompletedBusinessYmd();
  const manualOptions = { manual: true };
  const tasks = await loadTopLevelTasksForRollover(rolloverStatuses);
  const dates = mergePendingBusinessDates(
    businessDatesForManualRun(lastCompleted, now, tz),
    pendingBusinessDatesFromTasks(tasks, now, tz, rolloverStatuses, manualOptions),
  );

  for (const ymd of dates) {
    await ensureRunForDate(ymd, now, tz, rolloverStatuses, manualOptions);
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
