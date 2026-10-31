import { ymdInTimeZone, hmInTimeZone } from "../scheduling/time.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { dateToYmd } from "../recurrence/calculate.js";

export function buildCalendarEntriesForTask(task) {
  if (task.parentTaskId) {
    return [];
  }
  const timeZone = task.schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE;
  const entries = [];

  if (task.status === "Cancelled") {
    return entries;
  }

  let taskDateYmd = null;
  if (task.taskDate) {
    taskDateYmd = ymdInTimeZone(new Date(task.taskDate), timeZone);
  }

  if (task.schedule?.scheduledStart) {
    const ymd = ymdInTimeZone(new Date(task.schedule.scheduledStart), timeZone);
    entries.push({
      taskId: String(task._id),
      title: task.title,
      priority: task.priority,
      status: task.status,
      kind: "scheduled",
      ymd,
      time: hmInTimeZone(new Date(task.schedule.scheduledStart), timeZone),
      href: `/tasks/${task._id}`,
    });
    if (taskDateYmd === ymd) {
      taskDateYmd = null;
    }
  }

  if (taskDateYmd) {
    entries.push({
      taskId: String(task._id),
      title: task.title,
      priority: task.priority,
      status: task.status,
      kind: "taskDate",
      ymd: taskDateYmd,
      time: null,
      href: `/tasks/${task._id}`,
    });
  }

  if (task.schedule?.dueDate) {
    const ymd = ymdInTimeZone(new Date(task.schedule.dueDate), timeZone);
    entries.push({
      taskId: String(task._id),
      title: task.title,
      priority: task.priority,
      status: task.status,
      kind: "deadline",
      ymd,
      time: null,
      href: `/tasks/${task._id}`,
    });
  }

  if (task.recurrence?.enabled && task.recurrence.nextDueDate) {
    const ymd = dateToYmd(task.recurrence.nextDueDate, timeZone);
    if (ymd) {
      entries.push({
        taskId: String(task._id),
        title: task.title,
        priority: task.priority,
        status: task.status,
        kind: "recurringDue",
        ymd,
        time: null,
        href: `/tasks/${task._id}`,
      });
    }
  }

  return entries;
}

export function indexEntriesByYmd(tasks) {
  const byDay = {};
  for (const task of tasks) {
    for (const entry of buildCalendarEntriesForTask(task)) {
      if (!byDay[entry.ymd]) {
        byDay[entry.ymd] = [];
      }
      byDay[entry.ymd].push(entry);
    }
  }
  for (const ymd of Object.keys(byDay)) {
    byDay[ymd].sort((a, b) => a.title.localeCompare(b.title));
  }
  return byDay;
}

export function markersForDay(entries) {
  const markers = [];
  for (const entry of entries || []) {
    markers.push({ priority: entry.priority, kind: entry.kind });
  }
  return markers;
}

export function uniqueDayMarkers(entries) {
  const markers = [];
  const seenPriority = new Set();
  let financial = false;

  for (const entry of entries || []) {
    if (entry.marker === "financial") {
      financial = true;
      continue;
    }
    const key = entry.priority;
    if (!key || seenPriority.has(key)) {
      continue;
    }
    seenPriority.add(key);
    markers.push({ priority: key });
  }

  if (financial) {
    markers.push({ financial: true });
  }

  return markers;
}

export function uniquePriorityMarkers(entries) {
  return uniqueDayMarkers(entries).filter((marker) => marker.priority);
}
