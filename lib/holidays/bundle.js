import { ymdInTimeZone } from "@/lib/scheduling/time";
import { DEFAULT_SCHEDULE_TIMEZONE } from "@/lib/scheduling/constants";
import { fetchPakistanAndUSHolidays } from "./fetch";

const UPCOMING_POOL_SIZE = 24;

function dedupeHolidays(holidays) {
  const seen = new Set();
  const out = [];
  for (const item of holidays) {
    const key = `${item.date}\0${item.countryCode}\0${item.name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildUpcoming(years, todayYmd, limit = UPCOMING_POOL_SIZE) {
  const merged = dedupeHolidays(
    Object.values(years).flatMap((entry) => entry.holidays || []),
  );
  return merged
    .filter((item) => item.date >= todayYmd)
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) {
        return byDate;
      }
      return a.countryCode.localeCompare(b.countryCode);
    })
    .slice(0, limit);
}

export async function fetchHolidaysBundle(timeZone = DEFAULT_SCHEDULE_TIMEZONE) {
  const todayYmd = ymdInTimeZone(new Date(), timeZone);
  const baseYear = Number(todayYmd.slice(0, 4));
  const yearList = [baseYear - 1, baseYear, baseYear + 1];

  const years = {};
  const errors = {};

  for (const year of yearList) {
    const payload = await fetchPakistanAndUSHolidays(year);
    years[String(year)] = {
      year,
      holidays: payload.holidays,
      errors: payload.errors,
    };
    Object.assign(errors, payload.errors);
  }

  const upcoming = buildUpcoming(years, todayYmd);

  return { todayYmd, years, upcoming, errors };
}
