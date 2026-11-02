import { dateToYmd } from "@/lib/recurrence/calculate.js";
import { getRecurrenceOccurrenceStatus } from "@/lib/recurrence/occurrence-status.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants.js";

export function taskScheduleTimeZone(task) {
  return task?.schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE;
}

export function taskRecurringOccurrenceYmd(task) {
  if (!task?.recurrence?.enabled || !task.recurrence.nextDueDate) {
    return null;
  }
  return dateToYmd(task.recurrence.nextDueDate, taskScheduleTimeZone(task));
}

export function isRecurringOccurrenceContext(entry) {
  return Boolean(entry?.taskId && entry.kind === "recurringDue" && entry.ymd);
}

export function displayStatusForTaskListRow(task) {
  const ymd = taskRecurringOccurrenceYmd(task);
  if (ymd) {
    return getRecurrenceOccurrenceStatus(task.recurrence, ymd);
  }
  return task.status;
}

export function buildTaskStatusPatch(entryOrTask, newStatus, options = {}) {
  const { occurrenceYmd } = options;
  if (entryOrTask?.kind === "recurringDue" && entryOrTask.ymd) {
    return {
      setRecurrenceOccurrenceStatus: { ymd: entryOrTask.ymd, status: newStatus },
    };
  }
  const ymd = occurrenceYmd || taskRecurringOccurrenceYmd(entryOrTask);
  if (ymd && entryOrTask?.recurrence?.enabled) {
    return {
      setRecurrenceOccurrenceStatus: { ymd, status: newStatus },
    };
  }
  return { status: newStatus };
}
