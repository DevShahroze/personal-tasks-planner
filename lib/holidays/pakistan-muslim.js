/** Islamic holidays from Pakistan feeds (Google calendar titles). */

const ISLAMIC_HOLIDAY_PATTERN =
  /eid|ramadan|shab\s*e[- ]|ashura|chel+um|milad|mawlid|chand raat|giarhwin|shab\s*e[- ]?meraj|shab\s*e[- ]?qadr|shab\s*e[- ]?barat|youm[- ]?e[- ]?ashura|muharram|arafat|hajj|isra|mi['']?raj|lailat|al[- ]?qadr|prophet['']?s birthday|birthday of the prophet/i;

export function normalizePakistanHolidayTitle(title) {
  if (typeof title !== "string") {
    return "";
  }
  return title.replace(/\s*\(tentative\)\s*$/i, "").trim();
}

export function isPakistanMuslimHoliday(title) {
  const name = normalizePakistanHolidayTitle(title);
  if (!name) {
    return false;
  }
  return ISLAMIC_HOLIDAY_PATTERN.test(name);
}
