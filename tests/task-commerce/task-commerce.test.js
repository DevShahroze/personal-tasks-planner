import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCalendarEntriesForTask,
  indexEntriesByYmd,
} from "../../lib/calendar/task-entries.js";
import { applyTaskCommerceToCreate } from "../../lib/task-commerce/validate.js";

const TZ = "Asia/Karachi";

test("expected receive date appears on calendar", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Package",
    status: "To Do",
    priority: "Medium",
    expectedReceiveDate: new Date("2026-11-05T12:00:00.000Z"),
    schedule: { timezone: TZ },
  };
  const entries = buildCalendarEntriesForTask(task);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "expectedReceive");
  assert.equal(entries[0].ymd, "2026-11-05");
});

test("order dates replace task date on calendar", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Package",
    status: "To Do",
    priority: "Medium",
    taskDate: new Date("2026-10-31T12:00:00.000Z"),
    orderPlacedDate: new Date("2026-10-31T12:00:00.000Z"),
    expectedReceiveDate: new Date("2026-11-05T12:00:00.000Z"),
    schedule: { timezone: TZ },
  };
  const entries = buildCalendarEntriesForTask(task);
  const kinds = entries.map((entry) => entry.kind).sort();
  assert.deepEqual(kinds, ["expectedReceive", "orderPlaced"]);
});

test("task date stays when no order dates", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Call",
    status: "To Do",
    priority: "Medium",
    taskDate: new Date("2026-10-31T12:00:00.000Z"),
    schedule: { timezone: TZ },
  };
  const entries = buildCalendarEntriesForTask(task);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "taskDate");
});

test("cancelled task omits order dates from calendar", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Package",
    status: "Cancelled",
    priority: "Medium",
    orderPlacedDate: new Date("2026-10-31T12:00:00.000Z"),
    expectedReceiveDate: new Date("2026-11-06T12:00:00.000Z"),
    schedule: { timezone: TZ },
  };
  assert.equal(buildCalendarEntriesForTask(task).length, 0);
});

test("applyTaskCommerceToCreate parses order dates and comma money", () => {
  const errors = [];
  const value = { title: "x" };
  applyTaskCommerceToCreate(
    {
      intent: "buy",
      decisionStatus: "considering",
      orderPlacedDate: "2026-11-01",
      expectedReceiveDate: "2026-11-05",
      amountSpent: "52,800",
      currency: "pkr",
    },
    value,
    errors,
  );
  assert.equal(errors.length, 0);
  assert.equal(value.orderPlacedDate.toISOString().slice(0, 10), "2026-11-01");
  assert.equal(value.expectedReceiveDate.toISOString().slice(0, 10), "2026-11-05");
  assert.equal(value.amountSpent, 52800);
  assert.equal(value.currency, "PKR");
});

test("indexEntriesByYmd omits entries outside viewed month", () => {
  const task = {
    _id: "507f1f77bcf86cd799439011",
    title: "Package",
    status: "In Progress",
    priority: "High",
    taskDate: new Date("2026-10-31T12:00:00.000Z"),
    expectedReceiveDate: new Date("2026-11-06T12:00:00.000Z"),
    schedule: { timezone: TZ },
  };
  const byDay = indexEntriesByYmd([task], {
    monthFirstYmd: "2026-11-01",
    monthLastYmd: "2026-11-30",
  });
  assert.equal(byDay["2026-10-31"], undefined);
  assert.equal(byDay["2026-11-06"]?.[0]?.kind, "expectedReceive");
});

test("order placed after expected receive is rejected", () => {
  const errors = [];
  const value = {};
  applyTaskCommerceToCreate(
    {
      orderPlacedDate: "2026-11-10",
      expectedReceiveDate: "2026-11-05",
    },
    value,
    errors,
  );
  assert.ok(errors.some((message) => message.includes("Order placed date")));
});
