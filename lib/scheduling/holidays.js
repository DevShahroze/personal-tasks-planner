function readHolidaySet() {
  const raw = process.env.SCHEDULE_PUBLIC_HOLIDAYS;
  if (!raw || typeof raw !== "string") {
    return new Set();
  }
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
  return new Set(items);
}

let cached;

export function getConfiguredPublicHolidays() {
  if (!cached) {
    cached = readHolidaySet();
  }
  return cached;
}

export function isPublicHolidayYmd(ymd) {
  return getConfiguredPublicHolidays().has(ymd);
}

export function isHolidayCalendarConfigured() {
  return getConfiguredPublicHolidays().size > 0;
}
