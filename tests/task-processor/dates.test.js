import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDatesNeedingRuns,
  latestRolloverBusinessYmd,
} from "../../lib/task-processor/dates.js";

const TZ = "Asia/Karachi";

describe("task-processor dates", () => {
  it("does not queue the current calendar day before the next midnight", () => {
    const now = new Date("2026-11-01T10:25:00.000+05:00");
    const pending = businessDatesNeedingRuns("2026-10-31", now, TZ);
    assert.deepEqual(pending, []);
  });

  it("queues yesterday after the prior business day completed", () => {
    const now = new Date("2026-11-02T09:00:00.000+05:00");
    const end = latestRolloverBusinessYmd(now, TZ);
    assert.equal(end, "2026-11-01");
    const pending = businessDatesNeedingRuns("2026-10-31", now, TZ);
    assert.deepEqual(pending, ["2026-11-01"]);
  });

  it("uses the previous calendar day as the automatic rollover window", () => {
    const now = new Date("2026-10-31T10:00:00.000+05:00");
    assert.equal(latestRolloverBusinessYmd(now, TZ), "2026-10-30");
    const pending = businessDatesNeedingRuns("2026-10-29", now, TZ);
    assert.deepEqual(pending, ["2026-10-30"]);
  });
});
