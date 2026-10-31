import { ymdInTimeZone, hmInTimeZone } from "../scheduling/time.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { resolveTaskDateYmdForCalendar } from "../scheduling/align-task-date.js";

function taskUsesOrderCalendarDates(task) {
  return Boolean(task.orderPlacedDate || task.expectedReceiveDate || task.receivedDate);
}

export function buildCalendarEntriesForTask(task) {
  const timeZone = task.schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE;
  const entries = [];

  if (task.status === "Cancelled") {
    return entries;
  }

  const orderCalendar = taskUsesOrderCalendarDates(task);

  let taskDateYmd = null;
  if (task.taskDate && !orderCalendar) {
    taskDateYmd = resolveTaskDateYmdForCalendar(task);
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

  if (task.orderPlacedDate) {
    const ymd = ymdInTimeZone(new Date(task.orderPlacedDate), timeZone);
    if (ymd) {
      entries.push({
        taskId: String(task._id),
        title: task.title,
        priority: task.priority,
        status: task.status,
        kind: "orderPlaced",
        ymd,
        time: null,
        href: `/tasks/${task._id}`,
      });
    }
  }

  let expectedReceiveYmd = null;
  if (task.expectedReceiveDate) {
    expectedReceiveYmd = ymdInTimeZone(new Date(task.expectedReceiveDate), timeZone);
    if (expectedReceiveYmd) {
      entries.push({
        taskId: String(task._id),
        title: task.title,
        priority: task.priority,
        status: task.status,
        kind: "expectedReceive",
        ymd: expectedReceiveYmd,
        time: null,
        href: `/tasks/${task._id}`,
      });
    }
  }

  if (task.receivedDate) {
    const receivedYmd = ymdInTimeZone(new Date(task.receivedDate), timeZone);
    if (receivedYmd && receivedYmd !== expectedReceiveYmd) {
      entries.push({
        taskId: String(task._id),
        title: task.title,
        priority: task.priority,
        status: task.status,
        kind: "orderReceived",
        ymd: receivedYmd,
        time: null,
        href: `/tasks/${task._id}`,
      });
    }
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

  if (task.parentTaskId) {
    const parentTaskId = String(task.parentTaskId);
    for (let i = 0; i < entries.length; i += 1) {
      entries[i] = {
        ...entries[i],
        parentTaskId,
        ...(task.parentTitle ? { parentTitle: task.parentTitle } : {}),
      };
    }
  }

  return entries;
}

export function attachSubtasksToCalendarDays(byDay, subtasksByParentId) {
  if (!byDay || !subtasksByParentId) {
    return byDay || {};
  }

  const next = {};
  for (const [ymd, entries] of Object.entries(byDay)) {
    const merged = [...entries];
    const seenSubtaskIds = new Set(
      entries
        .filter((entry) => entry.parentTaskId && entry.taskId)
        .map((entry) => entry.taskId),
    );

    for (const entry of entries) {
      if (entry.parentTaskId || !entry.taskId) {
        continue;
      }
      const subs = subtasksByParentId[entry.taskId] || [];
      for (const sub of subs) {
        const subId = String(sub._id);
        if (seenSubtaskIds.has(subId)) {
          continue;
        }
        seenSubtaskIds.add(subId);
        merged.push({
          taskId: subId,
          title: sub.title,
          priority: sub.priority,
          status: sub.status,
          kind: "subtask",
          ymd,
          time: null,
          href: `/tasks/${subId}`,
          parentTaskId: String(sub.parentTaskId),
          parentTitle: sub.parentTitle || "",
        });
      }
    }

    next[ymd] = merged;
  }

  return next;
}

export function indexEntriesByYmd(tasks, options = {}) {
  const { monthFirstYmd, monthLastYmd } = options;
  const byDay = {};
  for (const task of tasks) {
    for (const entry of buildCalendarEntriesForTask(task)) {
      if (
        monthFirstYmd &&
        monthLastYmd &&
        (entry.ymd < monthFirstYmd || entry.ymd > monthLastYmd)
      ) {
        continue;
      }
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
    if (entry.parentTaskId) {
      continue;
    }
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
