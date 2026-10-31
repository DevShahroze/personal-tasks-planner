import test from "node:test";
import assert from "node:assert/strict";
import {
  bootstrapActivityLoggerSession,
  exportActivityLogsAsText,
  getActivityLogs,
  recordApiEnd,
  recordApiStart,
  recordPageVisit,
  resetActivityLoggerForTests,
  setLoggingEnabled,
} from "../../lib/activity-logger.js";

function mockBrowser() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
  globalThis.window = {
    location: { pathname: "/tasks" },
  };
  globalThis.performance = { now: () => 0 };
}

test("activity logs keep chronological order with concurrent API completions", () => {
  mockBrowser();
  resetActivityLoggerForTests();
  bootstrapActivityLoggerSession();
  setLoggingEnabled(true);

  const a = recordApiStart("GET", "/api/tasks?page=1");
  const b = recordApiStart("GET", "/api/categories");
  recordApiEnd(a, { status: 200, outcome: "SUCCESS", durationMs: 10 });
  recordPageVisit("/tasks/new");
  recordApiEnd(b, { status: 200, outcome: "SUCCESS", durationMs: 20 });

  const events = getActivityLogs();
  assert.equal(events.length, 4);
  assert.deepEqual(
    events.map((event) => event.type),
    ["PAGE", "API", "PAGE", "API"],
  );
  assert.equal(events[0].seq < events[1].seq, true);
  assert.equal(events[1].seq < events[2].seq, true);
  assert.equal(events[2].seq < events[3].seq, true);

  const text = exportActivityLogsAsText();
  assert.match(text, /#1 \| PAGE \| \/tasks/);
  assert.match(text, /#2 \| API \| GET \| \/api\/tasks\?page=1/);
  assert.match(text, /#3 \| PAGE \| \/tasks\/new/);
  assert.match(text, /#4 \| API \| GET \| \/api\/categories/);

  resetActivityLoggerForTests();
});
