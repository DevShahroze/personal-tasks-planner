import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareYmd } from "../../lib/task-processor/dates.js";
import {
  taskMatchesBusinessDate,
  taskPrimaryBusinessYmd,
} from "../../lib/task-processor/rollover-task.js";

const TZ = "Asia/Karachi";

describe("stranded rollover detection helpers", () => {
  it("treats open tasks before today as matching their task date", () => {
    const task = {
      taskDate: new Date("2026-10-31T12:00:00.000Z"),
      schedule: { mode: "unscheduled", timezone: TZ },
    };
    const ymd = taskPrimaryBusinessYmd(task, TZ);
    assert.equal(ymd, "2026-10-31");
    assert.equal(taskMatchesBusinessDate(task, ymd, TZ), true);
    assert.ok(compareYmd(ymd, "2026-11-01") < 0);
  });
});
