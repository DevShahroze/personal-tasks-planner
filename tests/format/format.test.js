import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatDateTime,
  formatYmd,
  formatHm12,
  formatAvailabilityHours,
} from "../../lib/format.js";

test("formatDate uses MM/DD/YYYY in UTC", () => {
  const value = formatDate("2026-06-15T15:30:00.000Z");
  assert.equal(value, "06/15/2026");
});

test("formatDateTime uses MM/DD/YYYY h:mm A in UTC", () => {
  const value = formatDateTime("2026-06-15T15:30:00.000Z");
  assert.match(value, /^06\/15\/2026 \d{1,2}:\d{2} (AM|PM)$/);
});

test("formatYmd converts ISO date keys for display", () => {
  assert.equal(formatYmd("2026-06-15"), "06/15/2026");
});

test("formatHm12 converts 24h wall times to 12h AM/PM", () => {
  assert.equal(formatHm12("09:00"), "9:00 AM");
  assert.equal(formatHm12("17:00"), "5:00 PM");
  assert.equal(formatHm12("00:30"), "12:30 AM");
});

test("formatAvailabilityHours includes timezone label", () => {
  assert.equal(
    formatAvailabilityHours("09:00", "17:00", "Asia/Karachi"),
    "9:00 AM – 5:00 PM (Asia/Karachi)",
  );
});
