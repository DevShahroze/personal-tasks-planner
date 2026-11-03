import TaskProcessorDailySession from "@/models/TaskProcessorDailySession.js";
import { ymdInTimeZone } from "../scheduling/time.js";

export function calendarDateYmdInProcessorTz(now, timeZone) {
  return ymdInTimeZone(now, timeZone);
}

export async function getDailySession(calendarDateYmd) {
  if (!calendarDateYmd) {
    return null;
  }
  return TaskProcessorDailySession.findOne({ calendarDateYmd }).lean();
}

export function serializeDailySession(doc) {
  if (!doc) {
    return null;
  }
  return {
    calendarDateYmd: doc.calendarDateYmd,
    status: doc.status,
    executionType: doc.executionType || "automatic",
    startedAt: doc.startedAt ? doc.startedAt.toISOString() : null,
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  };
}

export async function assertDailyRunAllowed(calendarDateYmd, options = {}) {
  const manual = options.executionType === "manual";
  if (manual) {
    return { ok: true, session: await getDailySession(calendarDateYmd) };
  }
  const session = await getDailySession(calendarDateYmd);
  if (session?.status === "completed") {
    return {
      ok: false,
      error: "Task Runner already completed successfully for today",
      session,
    };
  }
  return { ok: true, session };
}

export async function beginDailySession(
  calendarDateYmd,
  executionType,
  now = new Date(),
) {
  const type = executionType === "manual" ? "manual" : "automatic";
  if (type !== "manual") {
    const allowed = await assertDailyRunAllowed(calendarDateYmd);
    if (!allowed.ok) {
      return allowed;
    }
  }

  const existing = await getDailySession(calendarDateYmd);
  const startedAt =
    existing?.startedAt && existing.status === "running" ? existing.startedAt : now;
  const filter =
    type === "manual"
      ? { calendarDateYmd }
      : { calendarDateYmd, status: { $ne: "completed" } };
  const doc = await TaskProcessorDailySession.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "running",
        executionType: type,
        startedAt,
        completedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { ok: true, session: doc.toObject() };
}

export async function finishDailySession(calendarDateYmd, status, now = new Date()) {
  if (!calendarDateYmd || (status !== "completed" && status !== "failed")) {
    return null;
  }
  return TaskProcessorDailySession.findOneAndUpdate(
    { calendarDateYmd },
    {
      $set: {
        status,
        completedAt: now,
      },
    },
    { new: true },
  ).lean();
}
