import test from "node:test";
import assert from "node:assert/strict";
import {
  addIntervalToYmd,
  calculateNextDueDate,
  applyRecurrenceCompletion,
} from "../../lib/recurrence/calculate.js";
import { validateRecurrence } from "../../lib/recurrence/validate.js";
import { defaultRecurrence } from "../../lib/recurrence/defaults.js";
import { buildMonthCells, shiftMonth } from "../../lib/calendar/constants.js";
import { buildCalendarEntriesForTask } from "../../lib/calendar/task-entries.js";

const TZ = "Asia/Karachi";

test("addIntervalToYmd handles month-end dates", () => {
  assert.equal(addIntervalToYmd("2026-01-31", 1, "months"), "2026-02-28");
  assert.equal(addIntervalToYmd("2024-01-31", 1, "months"), "2024-02-29");
});

test("calculateNextDueDate requires a starting date", () => {
  const recurrence = {
    ...defaultRecurrence(),
    enabled: true,
    interval: 6,
    unit: "months",
  };
  const result = calculateNextDueDate(recurrence, TZ);
  assert.equal(result.nextDueDate, null);
  assert.equal(result.needsStartingDate, true);
});

test("calculateNextDueDate adds six months from last procedure date", () => {
  const recurrence = {
    ...defaultRecurrence(),
    enabled: true,
    interval: 6,
    unit: "months",
    lastProcedureDate: new Date("2026-01-10T00:00:00.000Z"),
  };
  const result = calculateNextDueDate(recurrence, TZ);
  assert.ok(result.nextDueDate);
  assert.equal(result.needsStartingDate, false);
});

test("applyRecurrenceCompletion preserves last procedure date when omitted", () => {
  const recurrence = {
    ...defaultRecurrence(),
    enabled: true,
    interval: 6,
    unit: "months",
    lastProcedureDate: new Date("2026-01-10T00:00:00.000Z"),
  };
  const applied = applyRecurrenceCompletion(
    recurrence,
    { completedDate: "2026-07-10" },
    TZ,
  );
  assert.equal(applied.ok, true);
  assert.equal(
    applied.recurrence.lastProcedureDate.toISOString(),
    recurrence.lastProcedureDate.toISOString(),
  );
  assert.ok(applied.recurrence.nextDueDate);
});

test("recurrence end date stops future due dates", () => {
  const recurrence = {
    ...defaultRecurrence(),
    enabled: true,
    interval: 1,
    unit: "months",
    lastProcedureDate: new Date("2026-01-10T00:00:00.000Z"),
    endDate: new Date("2026-02-01T00:00:00.000Z"),
  };
  const validated = validateRecurrence(recurrence, TZ);
  assert.equal(validated.ok, true);
  assert.equal(validated.value.nextDueDate, null);
});

test("buildMonthCells is deterministic", () => {
  const cells = buildMonthCells(2026, 10);
  assert.equal(cells.filter(Boolean).length, 31);
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});

test("calendar entries distinguish scheduled, deadline, and recurring due", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Dentist",
    status: "To Do",
    priority: "Medium",
    schedule: {
      timezone: TZ,
      scheduledStart: new Date("2026-06-02T04:00:00.000Z"),
      dueDate: new Date("2026-06-10T00:00:00.000Z"),
    },
    recurrence: {
      enabled: true,
      nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
    },
  };
  const entries = buildCalendarEntriesForTask(task);
  const kinds = entries.map((entry) => entry.kind).sort();
  assert.deepEqual(kinds, ["deadline", "recurringDue", "scheduled"]);
});
