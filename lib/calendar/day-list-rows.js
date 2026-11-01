import { calendarTaskId } from "./calendar-task-id.js";

export function buildCalendarDayListRows(entries) {
  const list = entries || [];
  const subtasksByParent = new Map();
  const taskEntries = [];
  const otherEntries = [];

  for (const entry of list) {
    if (entry.parentTaskId) {
      const parentId = calendarTaskId(entry.parentTaskId);
      if (!parentId) {
        continue;
      }
      const bucket = subtasksByParent.get(parentId) || [];
      bucket.push(entry);
      subtasksByParent.set(parentId, bucket);
      continue;
    }
    if (entry.taskId) {
      taskEntries.push(entry);
      continue;
    }
    otherEntries.push(entry);
  }

  for (const bucket of subtasksByParent.values()) {
    bucket.sort((a, b) => a.title.localeCompare(b.title));
  }

  const sortedTasks = [...taskEntries].sort((a, b) => a.title.localeCompare(b.title));
  const sortedOther = [...otherEntries].sort((a, b) => a.title.localeCompare(b.title));

  const rows = [];
  const subtasksShownForParent = new Set();

  for (const entry of sortedTasks) {
    rows.push({ entry, indent: false });
    const taskId = calendarTaskId(entry.taskId);
    if (!taskId || subtasksShownForParent.has(taskId)) {
      continue;
    }
    subtasksShownForParent.add(taskId);
    const subs = subtasksByParent.get(taskId) || [];
    for (const sub of subs) {
      rows.push({ entry: sub, indent: true });
    }
  }

  for (const entry of sortedOther) {
    rows.push({ entry, indent: false });
  }

  for (const [parentId, subs] of subtasksByParent) {
    const normalizedParentId = calendarTaskId(parentId);
    if (!normalizedParentId || subtasksShownForParent.has(normalizedParentId)) {
      continue;
    }
    const parentTitle = subs[0]?.parentTitle || "Parent task";
    rows.push({
      entry: {
        taskId: normalizedParentId,
        title: parentTitle,
        href: `/tasks/${normalizedParentId}`,
        kind: "parentHeader",
      },
      indent: false,
      isParentHeader: true,
    });
    for (const sub of subs) {
      rows.push({ entry: sub, indent: true });
    }
  }

  return rows;
}
