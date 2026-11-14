import { connectDB } from "@/lib/mongodb.js";
import Task from "@/models/Task.js";
import TaskProcessorRun from "@/models/TaskProcessorRun.js";
import {
  PROCESSOR_BATCH_SIZE,
  PROCESSOR_RUNNING_STALE_MS,
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
import {
  assertDailyRunAllowed,
  beginDailySession,
  calendarDateYmdInProcessorTz,
  finishDailySession,
  getDailySession,
  serializeDailySession,
} from "./daily-session.js";

function serializeRun(run) {
  const total = run.taskIds?.length || 0;
  const processed = run.processedTaskIds?.length || 0;
  const failed = run.failures?.length || 0;
  return {
    id: String(run._id),
    businessDateYmd: run.businessDateYmd,
    status: run.status,
    executionType: run.executionType || "automatic",
    startedAt: run.startedAt ? run.startedAt.toISOString() : null,
    completedAt: run.completedAt ? run.completedAt.toISOString() : null,
    errorSummary: run.errorSummary || "",
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
    executionType: doc.executionType || "automatic",
    status: "completed",
  };
}

async function getLastExecutionSnapshot() {
  const doc = await TaskProcessorRun.findOne({
    status: { $in: ["completed", "failed"] },
  })
    .sort({ updatedAt: -1 })
    .lean();
  if (!doc) {
    return null;
  }
  return {
    businessDateYmd: doc.businessDateYmd,
    status: doc.status,
    executionType: doc.executionType || "automatic",
    startedAt: doc.startedAt ? doc.startedAt.toISOString() : null,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
    errorSummary: doc.errorSummary || "",
    failedTaskCount: doc.failures?.length || 0,
  };
}

export async function getActiveRun() {
  await connectDB();
  return TaskProcessorRun.findOne({
    status: { $in: ["pending", "running", "failed"] },
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
      taskShouldRollNow(task, now, tz, rolloverStatuses) &&
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

  const executionType = options.executionType === "manual" ? "manual" : "automatic";

  if (run?.status === "completed") {
    if (!candidates.length) {
      return null;
    }
    run.status = "pending";
    run.executionType = executionType;
    run.taskIds = candidates.map((task) => task._id);
    run.processedTaskIds = [];
    run.failures = [];
    run.errorSummary = "";
    run.completedAt = null;
    run.startedAt = null;
    await run.save();
    return run;
  }

  if (run?.status === "failed") {
    if (!candidates.length) {
      return null;
    }
    run.status = "pending";
    run.executionType = executionType;
    run.taskIds = candidates.map((task) => task._id);
    run.processedTaskIds = [];
    run.failures = [];
    run.errorSummary = "";
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
      executionType,
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

async function recordEmptyBusinessDateRun(businessDateYmd, now, tz, executionType) {
  const existing = await TaskProcessorRun.findOne({ businessDateYmd }).exec();
  if (existing?.status === "completed") {
    return existing;
  }
  if (existing) {
    existing.status = "completed";
    existing.executionType = executionType;
    existing.taskIds = existing.taskIds?.length ? existing.taskIds : [];
    existing.processedTaskIds = existing.processedTaskIds || [];
    existing.failures = existing.failures || [];
    existing.errorSummary = "";
    existing.startedAt = existing.startedAt || now;
    existing.completedAt = now;
    await existing.save();
    return existing;
  }
  return TaskProcessorRun.create({
    businessDateYmd,
    timezone: tz,
    status: "completed",
    executionType,
    taskIds: [],
    processedTaskIds: [],
    failures: [],
    startedAt: now,
    completedAt: now,
  });
}

async function ensureRunForNextPendingDate(
  pendingDates,
  now,
  tz,
  rolloverStatuses,
  options = {},
) {
  const executionType = options.executionType === "manual" ? "manual" : "automatic";
  for (const businessDateYmd of pendingDates) {
    const run = await ensureRunForDate(
      businessDateYmd,
      now,
      tz,
      rolloverStatuses,
      options,
    );
    if (run) {
      return run;
    }
    await recordEmptyBusinessDateRun(businessDateYmd, now, tz, executionType);
  }
  return null;
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
  const pendingBusinessDates = mergePendingBusinessDates(fromTasks, scheduled);
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

async function buildManualProcessorStatus(now, tz, rolloverStatuses) {
  return buildProcessorStatus(now, tz, rolloverStatuses);
}

function hasPendingProcessorWork(built, unfinishedRun) {
  if (unfinishedRun) {
    return true;
  }
  return built.rolloverScan.toRoll > 0;
}

async function reconcileDailySessionRecord(
  calendarDateYmd,
  locked,
  autoPending,
  manualPending,
  unfinishedRun,
) {
  let session = await getDailySession(calendarDateYmd);
  if (!session || locked) {
    return serializeDailySession(session);
  }

  const actionable = autoPending || manualPending || unfinishedRun;
  if ((session.status === "running" || session.status === "failed") && !actionable) {
    await finishDailySession(calendarDateYmd, "completed");
    session = await getDailySession(calendarDateYmd);
  }

  return serializeDailySession(session);
}

async function syncDailySessionAfterWork(
  calendarDateYmd,
  tz,
  rolloverStatuses,
  unfinishedRun,
  failedRun,
) {
  const built = await buildProcessorStatus(new Date(), tz, rolloverStatuses);
  const builtManual = await buildManualProcessorStatus(
    new Date(),
    tz,
    rolloverStatuses,
  );
  const pending =
    hasPendingProcessorWork(built, unfinishedRun) ||
    hasPendingProcessorWork(builtManual, unfinishedRun);
  if (pending) {
    if (failedRun) {
      await finishDailySession(calendarDateYmd, "failed");
    }
    return;
  }
  await finishDailySession(calendarDateYmd, "completed");
}

async function healActiveRun(activeRun) {
  if (!activeRun) {
    return null;
  }
  if (activeRun.status === "failed") {
    return activeRun;
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
    Date.now() - new Date(activeRun.lastStepAt).getTime() > PROCESSOR_RUNNING_STALE_MS
  ) {
    activeRun.status = "pending";
    await activeRun.save();
    activeRun = await getActiveRun();
  }
  activeRun = await healActiveRun(activeRun);

  const calendarDateYmd = calendarDateYmdInProcessorTz(now, tz);
  const runSnapshot = activeRun ? serializeRun(activeRun) : null;
  const locked = Boolean(activeRun?.status === "running");

  let dailySession = serializeDailySession(await getDailySession(calendarDateYmd));
  const completedToday = dailySession?.status === "completed";

  const built = await buildProcessorStatus(now, tz, rolloverStatuses);
  const builtManual = await buildManualProcessorStatus(now, tz, rolloverStatuses);
  const lastCompletedRun = await getLastCompletedRunSnapshot();
  const lastExecution = await getLastExecutionSnapshot();
  const unfinishedRun =
    runSnapshot && runSnapshot.remaining > 0 && activeRun?.status !== "completed";
  const pendingWork = hasPendingProcessorWork(built, unfinishedRun);
  const manualPendingWork = hasPendingProcessorWork(builtManual, unfinishedRun);
  dailySession = await reconcileDailySessionRecord(
    calendarDateYmd,
    locked,
    pendingWork,
    manualPendingWork,
    unfinishedRun,
  );
  const completedTodayAfterHeal = dailySession?.status === "completed";
  const shouldRun = Boolean(pendingWork && !completedTodayAfterHeal && !locked);
  const canManualRun = !locked;

  let lifecycleStatus = "completed";
  if (locked) {
    lifecycleStatus = "running";
  } else if (shouldRun || manualPendingWork) {
    lifecycleStatus = "pending";
  } else if (dailySession?.status === "failed" && (pendingWork || manualPendingWork)) {
    lifecycleStatus = "failed";
  } else if (completedTodayAfterHeal) {
    lifecycleStatus = "completed";
  }

  return {
    locked,
    lifecycleStatus,
    calendarDateYmd,
    completedToday: completedTodayAfterHeal,
    canManualRun,
    dailySession,
    pendingBusinessDates: built.pendingBusinessDates,
    manualPendingBusinessDates: builtManual.pendingBusinessDates,
    rolloverScan: built.rolloverScan,
    manualRolloverScan: builtManual.rolloverScan,
    run: runSnapshot,
    lastCompleted: lastCompletedRun,
    lastExecution,
    timezone: tz,
    shouldRun,
  };
}

async function acquireRunForStep(run, now) {
  const pending = await TaskProcessorRun.findOneAndUpdate(
    { _id: run._id, status: "pending" },
    {
      $set: {
        status: "running",
        startedAt: run.startedAt || now,
        lastStepAt: now,
      },
    },
    { new: true },
  );
  if (pending) {
    return pending;
  }

  const continuing = await TaskProcessorRun.findOneAndUpdate(
    {
      _id: run._id,
      status: "running",
      lastStepAt: { $gte: new Date(Date.now() - PROCESSOR_STALE_MS) },
    },
    { $set: { lastStepAt: now } },
    { new: true },
  );
  return continuing;
}

export async function runProcessorStep(options = {}) {
  await connectDB();
  const tz = processorTimeZone();
  const now = new Date();
  const rolloverStatuses = await getRolloverStatuses();
  const calendarDateYmd = calendarDateYmdInProcessorTz(now, tz);
  const executionType = options.executionType === "manual" ? "manual" : "automatic";
  let status = await getProcessorStatus(now);

  const manualDrive = executionType === "manual";
  if (status.completedToday && !manualDrive) {
    return { ok: true, done: true, status };
  }
  const autoContinueBatch =
    !manualDrive && status.locked && status.run && status.run.remaining > 0;
  if (!manualDrive && !status.shouldRun && !autoContinueBatch) {
    return { ok: true, done: true, status };
  }

  const begun = await beginDailySession(calendarDateYmd, executionType, now);
  if (!begun.ok) {
    status = await getProcessorStatus(now);
    return { ok: false, error: begun.error, status };
  }

  let run = await getActiveRun();
  if (run?.status === "failed") {
    run.status = "pending";
    run.startedAt = null;
    run.completedAt = null;
    await run.save();
  }
  if (!run) {
    const pendingDates = manualDrive
      ? (await getProcessorStatus(now)).manualPendingBusinessDates
      : status.pendingBusinessDates;
    if (!pendingDates.length) {
      if (manualDrive) {
        await finishDailySession(calendarDateYmd, "completed", now);
      }
      status = await getProcessorStatus(now);
      return { ok: true, done: true, status };
    }
    run = await ensureRunForNextPendingDate(
      pendingDates,
      now,
      tz,
      rolloverStatuses,
      manualDrive ? { executionType: "manual" } : {},
    );
    if (!run) {
      status = await getProcessorStatus(new Date());
      const done = manualDrive
        ? !status.locked && (!status.run || status.run.remaining === 0)
        : !status.shouldRun && !status.run;
      return { ok: true, done, status };
    }
  }

  let acquired = await acquireRunForStep(run, now);
  if (!acquired) {
    const lastStepAt = run.lastStepAt ? new Date(run.lastStepAt).getTime() : 0;
    if (
      run.status === "running" &&
      lastStepAt &&
      Date.now() - lastStepAt > PROCESSOR_RUNNING_STALE_MS
    ) {
      run.status = "pending";
      await run.save();
      acquired = await acquireRunForStep(run, now);
    }
  }
  if (!acquired) {
    status = await getProcessorStatus(new Date());
    return { ok: false, error: "Task processor is already running", status };
  }
  run = acquired;

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
      const patch = buildRolloverPatch(task.toObject(), run.businessDateYmd, now, tz);
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
    if (run.failures.length > 0) {
      run.status = "failed";
      run.completedAt = new Date();
      run.errorSummary = `${run.failures.length} task(s) could not be rolled over`;
    } else {
      run.status = "completed";
      run.completedAt = new Date();
      run.errorSummary = "";
    }
  } else {
    run.status = "running";
  }
  await run.save();

  const activeAfter = await getActiveRun();
  const runSnapshotAfter = activeAfter ? serializeRun(activeAfter) : null;
  const unfinishedAfter =
    runSnapshotAfter &&
    runSnapshotAfter.remaining > 0 &&
    activeAfter?.status !== "completed";
  const failedRun = run.status === "failed";
  await syncDailySessionAfterWork(
    calendarDateYmd,
    tz,
    rolloverStatuses,
    unfinishedAfter,
    failedRun,
  );

  status = await getProcessorStatus(new Date());
  const done = manualDrive
    ? !status.locked && (!status.run || status.run.remaining === 0)
    : !status.shouldRun && !status.run;

  return { ok: true, done, status };
}

export async function prepareManualProcessorRuns(now = new Date()) {
  await connectDB();
  const tz = processorTimeZone();
  const rolloverStatuses = await getRolloverStatuses();
  const calendarDateYmd = calendarDateYmdInProcessorTz(now, tz);
  let status = await getProcessorStatus(now);
  if (status.locked) {
    return { ok: false, error: "Task processor is already running", status };
  }

  const lastCompleted = await getLastCompletedBusinessYmd();
  const tasks = await loadTopLevelTasksForRollover(rolloverStatuses);
  const dates = mergePendingBusinessDates(
    businessDatesForManualRun(lastCompleted, now, tz),
    pendingBusinessDatesFromTasks(tasks, now, tz, rolloverStatuses),
  );

  for (const ymd of dates) {
    await ensureRunForDate(ymd, now, tz, rolloverStatuses, {
      executionType: "manual",
    });
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
