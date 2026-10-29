import test from "node:test";
import assert from "node:assert/strict";
import {
  getClientTodaySnapshotForTests,
  invalidateClientTodaySnapshot,
} from "../../hooks/use-client-today.js";

test("client today snapshot is referentially stable", () => {
  invalidateClientTodaySnapshot();
  const first = getClientTodaySnapshotForTests();
  const second = getClientTodaySnapshotForTests();
  assert.equal(first, second);
  assert.match(first.ymd, /^\d{4}-\d{2}-\d{2}$/);
});
