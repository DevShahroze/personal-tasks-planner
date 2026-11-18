import { HOLIDAY_COUNTRIES } from "./constants.js";
import { isPakistanMuslimHoliday } from "./pakistan-muslim.js";

const NAGER_API = "https://date.nager.at/api/v3/PublicHolidays";
const PAKISTAN_ICS_URL =
  "https://calendar.google.com/calendar/ical/en.pk%23holiday%40group.v.calendar.google.com/public/basic.ics";
/** Extends PK dates when the Pakistan feed has not published the next year yet. */
const ISLAMIC_ICS_URL =
  "https://calendar.google.com/calendar/ical/en.islamic%23holiday%40group.v.calendar.google.com/public/basic.ics";

function holidayRow(date, name, localName, countryCode) {
  return { date, name, localName, countryCode };
}

async function readJsonArray(response) {
  if (response.status === 204) {
    return [];
  }
  const text = await response.text();
  if (!text.trim()) {
    return [];
  }
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error("Invalid holiday response");
  }
  return data;
}

export async function fetchCountryHolidays(year, countryCode) {
  const response = await fetch(`${NAGER_API}/${year}/${countryCode}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });
  if (!response.ok) {
    throw new Error(`Holiday data unavailable (${response.status})`);
  }
  const data = await readJsonArray(response);
  return data.map((item) =>
    holidayRow(item.date, item.name, item.localName, countryCode),
  );
}

function icsDateToYmd(line) {
  const match = line.match(/DTSTART[^:]*:(\d{8})/);
  if (!match) {
    return null;
  }
  const raw = match[1];
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function fetchIcsText(url, feedLabel) {
  const response = await fetch(url, {
    headers: { Accept: "text/calendar" },
    next: { revalidate: 86_400 },
  });
  if (!response.ok) {
    throw new Error(`${feedLabel} unavailable (${response.status})`);
  }
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`${feedLabel} empty`);
  }
  return text;
}

function parseIslamicHolidaysFromIcs(text, year, countryCode) {
  const yearPrefix = String(year);
  const holidays = [];
  for (const block of text.split("BEGIN:VEVENT").slice(1)) {
    const lines = block.split(/\r?\n/);
    const startLine = lines.find((line) => line.startsWith("DTSTART"));
    const summaryLine = lines.find((line) => line.startsWith("SUMMARY"));
    if (!startLine || !summaryLine) {
      continue;
    }
    const date = icsDateToYmd(startLine);
    if (!date || !date.startsWith(yearPrefix)) {
      continue;
    }
    const name = summaryLine.slice("SUMMARY:".length).trim();
    if (!isPakistanMuslimHoliday(name)) {
      continue;
    }
    holidays.push(holidayRow(date, name, name, countryCode));
  }
  return holidays;
}

function mergeDedupePakistanRows(rows) {
  const deduped = [];
  const seen = new Set();
  for (const item of rows) {
    const key = `${item.date}\0${item.name.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  deduped.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return deduped;
}

export async function fetchPakistanHolidaysFromIcs(year) {
  const settled = await Promise.allSettled([
    fetchIcsText(PAKISTAN_ICS_URL, "Pakistan holiday feed"),
    fetchIcsText(ISLAMIC_ICS_URL, "Islamic holiday feed"),
  ]);

  const pkText = settled[0].status === "fulfilled" ? settled[0].value : null;
  const islamicText = settled[1].status === "fulfilled" ? settled[1].value : null;

  if (!pkText && !islamicText) {
    const reason =
      settled.find((r) => r.status === "rejected")?.reason ||
      new Error("No holiday feeds");
    throw reason;
  }

  const merged = [
    ...(pkText ? parseIslamicHolidaysFromIcs(pkText, year, "PK") : []),
    ...(islamicText ? parseIslamicHolidaysFromIcs(islamicText, year, "PK") : []),
  ];

  return mergeDedupePakistanRows(merged);
}

export async function fetchPakistanAndUSHolidays(year) {
  const [usResult, pkResult] = await Promise.allSettled([
    fetchCountryHolidays(year, "US"),
    fetchPakistanHolidaysFromIcs(year),
  ]);

  const holidays = [];
  const errors = {};

  if (usResult.status === "fulfilled") {
    holidays.push(...usResult.value);
  } else {
    errors.US = usResult.reason?.message || "Could not load United States holidays";
  }

  if (pkResult.status === "fulfilled") {
    holidays.push(...pkResult.value);
  } else {
    errors.PK = pkResult.reason?.message || "Could not load Pakistan holidays";
  }

  const deduped = [];
  const seen = new Set();
  for (const item of holidays) {
    const key = `${item.date}\0${item.countryCode}\0${item.name}\0${item.localName || ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  deduped.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) {
      return byDate;
    }
    return a.countryCode.localeCompare(b.countryCode);
  });

  return { year, holidays: deduped, errors };
}

export { HOLIDAY_COUNTRIES };
