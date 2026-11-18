const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function parseHolidayYear(searchParams) {
  const raw = searchParams.get("year");
  const year = raw ? Number.parseInt(raw, 10) : new Date().getFullYear();
  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { ok: false, error: "Invalid year", year: null };
  }
  return { ok: true, error: null, year };
}

export function parseUpcomingLimit(searchParams) {
  const raw = searchParams.get("upcoming");
  if (raw === null || raw === "") {
    return { ok: false, upcoming: false, limit: 8 };
  }
  const limit = Number.parseInt(raw, 10);
  if (!Number.isFinite(limit) || limit < 1) {
    return { ok: false, error: "Invalid upcoming limit", upcoming: true, limit: null };
  }
  return { ok: true, upcoming: true, limit: Math.min(limit, 20), error: null };
}
