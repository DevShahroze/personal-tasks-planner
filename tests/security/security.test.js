import test from "node:test";
import assert from "node:assert/strict";
import { isPlainJsonObject, safeAppPath } from "../../lib/security/pure.js";
import {
  buildTaskListFilter,
  sanitizeTextSearch,
} from "../../lib/security/task-filters.js";
import {
  consumeRateLimit,
  resetRateLimitsForTests,
} from "../../lib/security/rate-limit.js";
import { isValidObjectId } from "../../lib/security/ids.js";

test("safeAppPath blocks open redirects", () => {
  assert.equal(safeAppPath("/dashboard"), "/dashboard");
  assert.equal(safeAppPath("//evil.com"), "/dashboard");
  assert.equal(safeAppPath("https://evil.com"), "/dashboard");
  assert.equal(safeAppPath(null), "/dashboard");
});

test("isPlainJsonObject rejects Mongo operators", () => {
  assert.equal(isPlainJsonObject({ title: "ok" }), true);
  assert.equal(isPlainJsonObject({ $where: "1==1" }), false);
});

test("buildTaskListFilter ignores invalid status injection", () => {
  const params = new URLSearchParams({
    status: '{"$ne":"Completed"}',
    priority: "Urgent",
  });
  const filter = buildTaskListFilter(params);
  assert.equal(filter.status, undefined);
  assert.equal(filter.$and[0].priority, "Urgent");
});

test("sanitizeTextSearch strips dollar characters and limits length", () => {
  const value = sanitizeTextSearch("$ne test " + "a".repeat(300));
  assert.equal(value.includes("$"), false);
  assert.ok(value.length <= 200);
});

test("isValidObjectId validates hex object ids only", () => {
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("not-an-id"), false);
});

test("rate limit returns limited state after threshold", () => {
  resetRateLimitsForTests();
  const key = "test-ip";
  let limited = false;
  for (let i = 0; i < 11; i += 1) {
    const result = consumeRateLimit(key, "auth");
    if (result.limited) {
      limited = true;
      assert.ok(result.retryAfter >= 1);
      break;
    }
  }
  assert.equal(limited, true);
});
