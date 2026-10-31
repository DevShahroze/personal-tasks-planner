import test from "node:test";
import assert from "node:assert/strict";
import {
  intervalsOverlap,
  ymdInTimeZone,
  zonedDateTimeToUtc,
  isoWeekdayInTimeZone,
} from "../../lib/scheduling/time.js";
import { validateSchedule } from "../../lib/scheduling/validate.js";
import {
  defaultSchedule,
  normalizeStoredSchedule,
} from "../../lib/scheduling/defaults.js";
import { suggestFlexibleSlots } from "../../lib/scheduling/slots.js";
import {
  intervalWithinAvailability,
  availabilityWindowForDay,
} from "../../lib/scheduling/availability.js";
import {
  inferScheduleModeFromFormState,
  scheduleFromFormState,
} from "../../lib/scheduling/client-form.js";
import {
  alignTaskDateAndSchedule,
  firstSchedulableYmdOnOrAfter,
} from "../../lib/scheduling/align-task-date.js";
import { validateYmdAgainstSchedule } from "../../lib/calendar/schedule-date-check.js";

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

test("scheduleFromFormState infers fixed from task date and start time", () => {
  const schedule = scheduleFromFormState({
    visitAvailabilityEnabled: false,
    scheduledDate: "2026-06-02",
    scheduledStartTime: "10:00",
    scheduledEndTime: "11:00",
    timezone: TZ,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startTime: "09:00",
    endTime: "17:00",
    excludePublicHolidays: false,
    avoidConflicts: true,
    availabilityTemplateId: "",
    durationMinutes: "",
    earliestDate: "",
    dueDate: "",
    selectedSlot: null,
    timeSlots: [],
  });
  assert.equal(schedule.mode, "fixed");
  assert.ok(schedule.scheduledStart);
  assert.ok(schedule.scheduledEnd);
});

test("scheduleFromFormState rolls end time to next day when end is before start", () => {
  const schedule = scheduleFromFormState({
    visitAvailabilityEnabled: false,
    scheduledDate: "2026-06-02",
    scheduledStartTime: "22:00",
    scheduledEndTime: "01:00",
    timezone: TZ,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    startTime: "00:00",
    endTime: "23:59",
    excludePublicHolidays: false,
    avoidConflicts: true,
    availabilityTemplateId: "",
    durationMinutes: "",
    earliestDate: "",
    dueDate: "",
    selectedSlot: null,
    timeSlots: [],
  });
  const start = new Date(schedule.scheduledStart);
  const end = new Date(schedule.scheduledEnd);
  assert.ok(end > start);
  assert.equal(ymdInTimeZone(start, TZ), "2026-06-02");
  assert.equal(ymdInTimeZone(end, TZ), "2026-06-03");
  const validated = validateSchedule({
    ...defaultSchedule(),
    ...schedule,
    scheduledStart: start,
    scheduledEnd: end,
  });
  assert.equal(validated.ok, true);
});

test("scheduleFromFormState infers flexible when visit availability is enabled", () => {
  assert.equal(
    inferScheduleModeFromFormState({
      visitAvailabilityEnabled: true,
      scheduledDate: "",
      scheduledStartTime: "",
    }),
    "flexible",
  );
  assert.equal(
    inferScheduleModeFromFormState({
      visitAvailabilityEnabled: false,
      scheduledDate: "2026-06-02",
      scheduledStartTime: "09:00",
    }),
    "fixed",
  );
});

test("availabilityWindowForDay uses custom time slots when set", () => {
  const windows = availabilityWindowForDay(
    "2026-06-02",
    {
      startTime: "00:00",
      endTime: "23:59",
      timeSlots: [
        { startTime: "09:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "16:00" },
      ],
    },
    TZ,
  );
  assert.equal(windows?.length, 2);
});

test("alignTaskDateAndSchedule moves Saturday to Monday for weekday-only availability", () => {
  const saturday = zonedDateTimeToUtc("2026-10-31", "12:00", TZ);
  assert.equal(isoWeekdayInTimeZone(saturday, TZ), 6);
  const schedule = {
    ...defaultSchedule(),
    mode: "flexible",
    timezone: TZ,
    durationMinutes: 60,
    availability: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      excludePublicHolidays: false,
      timeSlots: [],
    },
  };
  assert.equal(firstSchedulableYmdOnOrAfter("2026-10-31", schedule), "2026-11-02");
  const aligned = alignTaskDateAndSchedule(saturday, schedule);
  assert.equal(aligned.adjusted, true);
  assert.equal(aligned.taskDate.toISOString().slice(0, 10), "2026-11-02");
});

test("validateYmdAgainstSchedule treats earliest date as calendar day in task timezone", () => {
  const schedule = {
    ...defaultSchedule(),
    mode: "flexible",
    timezone: TZ,
    earliestDate: new Date("2026-10-31T00:00:00.000Z"),
    availability: {
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      excludePublicHolidays: false,
      timeSlots: [],
    },
  };
  const result = validateYmdAgainstSchedule("2026-10-31", schedule);
  assert.equal(result.ok, false);
  assert.match(result.message, /availability/i);
});
