import { normalizeStoredSchedule } from "../scheduling/defaults.js";
import { hmInTimeZone, zonedDateTimeToUtc } from "../scheduling/time.js";

export function visitKindForIndex(index, total) {
  if (total <= 1) {
    return "Visit";
  }
  return index === 0 ? "Initial visit" : `Follow-up visit ${index}`;
}

export function buildVisitKindMap(visits) {
  const sorted = [...visits].sort(
    (a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime(),
  );
  const map = new Map();
  sorted.forEach((visit, index) => {
    map.set(String(visit._id), visitKindForIndex(index, sorted.length));
  });
  return map;
}

/** Move next calendar appearance to nextYmd without creating a new task. */
export function buildFollowUpTaskPatch(task, nextYmd) {
  const taskDate = new Date(`${nextYmd}T12:00:00.000Z`);
  if (Number.isNaN(taskDate.getTime())) {
    return { ok: false, error: "Invalid follow-up date" };
  }

  const patch = { taskDate };
  const schedule = normalizeStoredSchedule(task.schedule);
  const tz = schedule.timezone;

  if (schedule.scheduledStart) {
    const hm = hmInTimeZone(schedule.scheduledStart, tz);
    const start = hm ? zonedDateTimeToUtc(nextYmd, hm, tz) : null;
    if (start) {
      let scheduledEnd = schedule.scheduledEnd;
      if (schedule.scheduledEnd) {
        const durationMs =
          schedule.scheduledEnd.getTime() - schedule.scheduledStart.getTime();
        scheduledEnd = new Date(start.getTime() + durationMs);
      }
      patch.schedule = {
        ...schedule,
        scheduledStart: start,
        scheduledEnd,
      };
    }
  }

  return { ok: true, patch };
}
