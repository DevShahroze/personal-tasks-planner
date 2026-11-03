import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pendingBusinessDatesFromTasks,
  summarizeRolloverTaskScan,
  taskRolloverDateBucket,
  taskShouldRollNow,
} from "../../lib/task-processor/eligibility.js";

const TZ = "Asia/Karachi";
const STATUSES = ["To Do", "In Progress"];

describe("rollover eligibility", () => {
  it("classifies past, present, and future task dates", () => {
    assert.equal(taskRolloverDateBucket("2026-10-31", "2026-11-01"), "past");
    assert.equal(taskRolloverDateBucket("2026-11-01", "2026-11-01"), "present");
    assert.equal(taskRolloverDateBucket("2026-11-05", "2026-11-01"), "future");
  });

  it("rolls all past eligible tasks and skips future", () => {
    const now = new Date("2026-11-01T10:00:00.000+05:00");
    const pastTask = {
      status: "To Do",
      taskDate: new Date("2026-10-31T12:00:00.000Z"),
      schedule: { mode: "unscheduled", timezone: TZ },
    };
    const futureTask = {
      status: "To Do",
      taskDate: new Date("2026-11-10T12:00:00.000Z"),
      schedule: { mode: "unscheduled", timezone: TZ },
    };
    assert.equal(taskShouldRollNow(pastTask, now, TZ, STATUSES), true);
    assert.equal(taskShouldRollNow(futureTask, now, TZ, STATUSES), false);

    const scan = summarizeRolloverTaskScan([pastTask, futureTask], now, TZ, STATUSES);
    assert.equal(scan.past, 1);
    assert.equal(scan.future, 1);
    assert.equal(scan.toRoll, 1);

    const dates = pendingBusinessDatesFromTasks(
      [pastTask, futureTask],
      now,
      TZ,
      STATUSES,
    );
    assert.deepEqual(dates, ["2026-10-31"]);
  });

  it("never rolls present-day tasks (manual or automatic)", () => {
    const now = new Date("2026-11-01T10:00:00.000+05:00");
    const todayTask = {
      status: "In Progress",
      taskDate: new Date("2026-11-01T12:00:00.000Z"),
      schedule: { mode: "unscheduled", timezone: TZ },
    };
    assert.equal(taskShouldRollNow(todayTask, now, TZ, STATUSES), false);
  });
});
