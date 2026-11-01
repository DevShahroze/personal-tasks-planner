import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDatesNeedingRuns,
  latestRolloverBusinessYmd,
} from "../../lib/task-processor/dates.js";

const TZ = "Asia/Karachi";

describe("task-processor dates", () => {
  it("queues next business date after last completed when calendar day advances", () => {
    const now = new Date("2026-11-01T10:25:00.000+05:00");
    const pending = businessDatesNeedingRuns("2026-10-31", now, TZ);
    assert.deepEqual(pending, ["2026-11-01"]);
  });

  it("queues today after prior business day completed when still before 11 PM", () => {
    const now = new Date("2026-10-31T10:00:00.000+05:00");
    const end = latestRolloverBusinessYmd(now, TZ);
    assert.equal(end, "2026-10-30");
    const pending = businessDatesNeedingRuns("2026-10-30", now, TZ);
    assert.deepEqual(pending, ["2026-10-31"]);
  });

  it("includes today after 11 PM local", () => {
    const now = new Date("2026-11-01T23:30:00.000+05:00");
    assert.equal(latestRolloverBusinessYmd(now, TZ), "2026-11-01");
    const pending = businessDatesNeedingRuns("2026-10-31", now, TZ);
    assert.deepEqual(pending, ["2026-11-01"]);
  });
});
