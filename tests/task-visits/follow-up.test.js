import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTaskNoteCreate } from "../../lib/task-notes/validate.js";
import {
  buildFollowUpTaskPatch,
  buildVisitKindMap,
  visitKindForIndex,
} from "../../lib/task-visits/follow-up.js";

test("validateTaskNoteCreate requires content for plain notes", () => {
  const result = validateTaskNoteCreate({ content: "" });
  assert.equal(result.ok, false);
});

test("validateTaskNoteCreate allows visit with optional note", () => {
  const result = validateTaskNoteCreate({ visitDate: "2026-03-01", content: "" });
  assert.equal(result.ok, true);
  assert.equal(result.value.visitDate.toISOString(), "2026-03-01T12:00:00.000Z");
});

test("visitKindForIndex labels initial and follow-ups", () => {
  assert.equal(visitKindForIndex(0, 1), "Visit");
  assert.equal(visitKindForIndex(0, 2), "Initial visit");
  assert.equal(visitKindForIndex(1, 2), "Follow-up visit 1");
});

test("buildVisitKindMap orders by visit date", () => {
  const map = buildVisitKindMap([
    { _id: "b", visitDate: "2026-03-02T12:00:00.000Z" },
    { _id: "a", visitDate: "2026-03-01T12:00:00.000Z" },
  ]);
  assert.equal(map.get("a"), "Initial visit");
  assert.equal(map.get("b"), "Follow-up visit 1");
});

test("buildFollowUpTaskPatch moves taskDate and fixed schedule", () => {
  const task = {
    taskDate: "2026-03-01T12:00:00.000Z",
    schedule: {
      mode: "fixed",
      timezone: "UTC",
      scheduledStart: "2026-03-01T10:00:00.000Z",
      scheduledEnd: "2026-03-01T11:00:00.000Z",
      availability: {
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startTime: "00:00",
        endTime: "23:59",
        excludePublicHolidays: false,
      },
      avoidConflicts: true,
    },
  };
  const built = buildFollowUpTaskPatch(task, "2026-03-02");
  assert.equal(built.ok, true);
  assert.equal(built.patch.taskDate.toISOString(), "2026-03-02T12:00:00.000Z");
  assert.equal(
    built.patch.schedule.scheduledStart.toISOString(),
    "2026-03-02T10:00:00.000Z",
  );
});
