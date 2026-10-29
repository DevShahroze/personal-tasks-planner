import test from "node:test";
import assert from "node:assert/strict";
import {
  intervalsOverlap,
  zonedDateTimeToUtc,
  isoWeekdayInTimeZone,
} from "../../lib/scheduling/time.js";
import { validateSchedule } from "../../lib/scheduling/validate.js";
import {
  defaultSchedule,
  normalizeStoredSchedule,
} from "../../lib/scheduling/defaults.js";
import { suggestFlexibleSlots } from "../../lib/scheduling/slots.js";
import { intervalWithinAvailability } from "../../lib/scheduling/availability.js";

const TZ = "Asia/Karachi";

test("normalizeStoredSchedule applies defaults for legacy tasks", () => {
  const schedule = normalizeStoredSchedule(undefined);
  assert.equal(schedule.mode, "unscheduled");
  assert.equal(schedule.timezone, TZ);
  assert.equal(schedule.avoidConflicts, true);
});

test("adjacent intervals do not overlap", () => {
  const aStart = new Date("2026-06-01T07:00:00.000Z");
  const aEnd = new Date("2026-06-01T08:00:00.000Z");
  const bStart = new Date("2026-06-01T08:00:00.000Z");
  const bEnd = new Date("2026-06-01T09:00:00.000Z");
  assert.equal(intervalsOverlap(aStart, aEnd, bStart, bEnd), false);
});

test("overlapping intervals are detected", () => {
  const aStart = new Date("2026-06-01T07:00:00.000Z");
  const aEnd = new Date("2026-06-01T09:00:00.000Z");
  const bStart = new Date("2026-06-01T08:00:00.000Z");
  const bEnd = new Date("2026-06-01T10:00:00.000Z");
  assert.equal(intervalsOverlap(aStart, aEnd, bStart, bEnd), true);
});

test("fixed schedule requires start and end", () => {
  const base = defaultSchedule();
  const result = validateSchedule({
    ...base,
    mode: "fixed",
    scheduledStart: null,
    scheduledEnd: null,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("require scheduled start")));
});

test("flexible schedule requires duration", () => {
  const base = defaultSchedule();
  const result = validateSchedule({
    ...base,
    mode: "flexible",
    durationMinutes: null,
  });
  assert.equal(result.ok, false);
});

test("fixed schedule rejects end before start", () => {
  const start = zonedDateTimeToUtc("2026-06-02", "10:00", TZ);
  const end = zonedDateTimeToUtc("2026-06-02", "09:00", TZ);
  const base = defaultSchedule();
  const result = validateSchedule({
    ...base,
    mode: "fixed",
    scheduledStart: start,
    scheduledEnd: end,
    availability: {
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      startTime: "00:00",
      endTime: "23:59",
      excludePublicHolidays: false,
    },
  });
  assert.equal(result.ok, false);
});

test("fixed schedule validates availability window", () => {
  const start = zonedDateTimeToUtc("2026-06-02", "08:00", TZ);
  const end = zonedDateTimeToUtc("2026-06-02", "09:00", TZ);
  const weekday = isoWeekdayInTimeZone(start, TZ);
  const base = defaultSchedule();
  const result = validateSchedule({
    ...base,
    mode: "fixed",
    scheduledStart: start,
    scheduledEnd: end,
    availability: {
      daysOfWeek: [weekday],
      startTime: "09:00",
      endTime: "17:00",
      excludePublicHolidays: false,
    },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("availability")));
});

test("intervalWithinAvailability accepts business-hours slot", () => {
  const start = zonedDateTimeToUtc("2026-06-02", "10:00", TZ);
  const end = zonedDateTimeToUtc("2026-06-02", "11:00", TZ);
  const schedule = {
    ...defaultSchedule(),
    timezone: TZ,
    availability: {
      daysOfWeek: [isoWeekdayInTimeZone(start, TZ)],
      startTime: "09:00",
      endTime: "17:00",
      excludePublicHolidays: false,
    },
  };
  assert.equal(intervalWithinAvailability(start, end, schedule), true);
});

test("suggestFlexibleSlots returns chronological non-overlapping options", () => {
  const start = zonedDateTimeToUtc("2026-06-02", "10:00", TZ);
  const end = zonedDateTimeToUtc("2026-06-02", "11:00", TZ);
  const schedule = {
    ...defaultSchedule(),
    mode: "flexible",
    durationMinutes: 60,
    timezone: TZ,
    earliestDate: start,
    availability: {
      daysOfWeek: [isoWeekdayInTimeZone(start, TZ)],
      startTime: "09:00",
      endTime: "17:00",
      excludePublicHolidays: false,
    },
  };
  const result = suggestFlexibleSlots({
    schedule,
    blockingIntervals: [{ start, end }],
    limit: 5,
    now: new Date("2026-06-01T00:00:00.000Z"),
  });
  assert.equal(result.ok, true);
  assert.ok(result.slots.length > 0);
  for (const slot of result.slots) {
    assert.ok(slot.scheduledEnd > slot.scheduledStart);
    assert.equal(
      intervalsOverlap(slot.scheduledStart, slot.scheduledEnd, start, end),
      false,
    );
  }
});

test("suggestFlexibleSlots reports when nothing is available", () => {
  const day = zonedDateTimeToUtc("2026-06-02", "09:00", TZ);
  const schedule = {
    ...defaultSchedule(),
    mode: "flexible",
    durationMinutes: 480,
    timezone: TZ,
    earliestDate: day,
    dueDate: day,
    availability: {
      daysOfWeek: [isoWeekdayInTimeZone(day, TZ)],
      startTime: "09:00",
      endTime: "10:00",
      excludePublicHolidays: false,
    },
  };
  const result = suggestFlexibleSlots({
    schedule,
    blockingIntervals: [],
    limit: 3,
    now: new Date("2026-06-01T00:00:00.000Z"),
  });
  assert.equal(result.ok, true);
  assert.equal(result.slots.length, 0);
  assert.match(result.message, /No eligible time slots/i);
});

test("unscheduled mode rejects scheduled timestamps", () => {
  const start = zonedDateTimeToUtc("2026-06-02", "10:00", TZ);
  const end = zonedDateTimeToUtc("2026-06-02", "11:00", TZ);
  const result = validateSchedule({
    ...defaultSchedule(),
    mode: "unscheduled",
    scheduledStart: start,
    scheduledEnd: end,
  });
  assert.equal(result.ok, false);
});
