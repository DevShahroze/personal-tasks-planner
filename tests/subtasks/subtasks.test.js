import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSubtaskSummary,
  mergeWithTopLevelFilter,
  subtaskSummary,
} from "../../lib/subtasks/constants.js";
import { buildTaskListFilter } from "../../lib/security/task-filters.js";
import {
  buildCalendarEntriesForTask,
  attachSubtasksToCalendarDays,
} from "../../lib/calendar/task-entries.js";

test("subtaskSummary counts completed subtasks", () => {
  const summary = subtaskSummary([
    { status: "Completed" },
    { status: "To Do" },
    { status: "In Progress" },
    { status: "Completed" },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.completed, 2);
});

test("formatSubtaskSummary describes progress", () => {
  assert.equal(formatSubtaskSummary({ total: 0, completed: 0 }), "No subtasks");
  assert.equal(
    formatSubtaskSummary({ total: 4, completed: 2 }),
    "2 of 4 subtasks completed",
  );
});

test("mergeWithTopLevelFilter excludes nested tasks", () => {
  const merged = mergeWithTopLevelFilter({ status: "To Do" });
  assert.ok(Array.isArray(merged.$and));
  assert.equal(merged.$and[0].status, "To Do");
  assert.ok(merged.$and[1].$or);
});

test("buildTaskListFilter only returns top-level tasks", () => {
  const filter = buildTaskListFilter(new URLSearchParams({ status: "To Do" }));
  assert.equal(filter.status, undefined);
  assert.equal(filter.$and[0].status, "To Do");
  assert.ok(filter.$and[1].$or);
});

test("calendar entries include subtasks with parent link", () => {
  const entries = buildCalendarEntriesForTask({
    _id: "507f1f77bcf86cd799439011",
    title: "Child",
    parentTaskId: "507f1f77bcf86cd799439012",
    parentTitle: "Parent",
    taskDate: "2026-06-01",
    priority: "Medium",
    status: "To Do",
    recurrence: { enabled: false },
    schedule: { mode: "unscheduled", timezone: "Asia/Karachi" },
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].parentTaskId, "507f1f77bcf86cd799439012");
  assert.equal(entries[0].parentTitle, "Parent");
});

test("attachSubtasksToCalendarDays lists subtasks under parent task days", () => {
  const parentId = "507f1f77bcf86cd799439012";
  const byDay = {
    "2026-11-02": [
      {
        taskId: parentId,
        title: "Parent task",
        kind: "taskDate",
        ymd: "2026-11-02",
        href: `/tasks/${parentId}`,
      },
    ],
  };
  const subtasksByParentId = {
    [parentId]: [
      {
        _id: "507f1f77bcf86cd799439011",
        parentTaskId: parentId,
        title: "Child step",
        priority: "Medium",
        status: "To Do",
        parentTitle: "Parent task",
      },
    ],
  };
  const enriched = attachSubtasksToCalendarDays(byDay, subtasksByParentId);
  assert.equal(enriched["2026-11-02"].length, 2);
  assert.equal(enriched["2026-11-02"][1].kind, "subtask");
  assert.equal(enriched["2026-11-02"][1].parentTaskId, parentId);
});
