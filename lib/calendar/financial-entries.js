import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { FINANCIAL_TYPE_LABEL } from "../finance/constants.js";

const CALENDAR_ROLL_FORWARD_TYPES = new Set(["money_lent", "money_borrowed"]);

export function financialCalendarDisplayYmd(record, options = {}) {
  if (!record.expectedDate) {
    return null;
  }
  const timeZone = options.timeZone || DEFAULT_SCHEDULE_TIMEZONE;
  const expectedYmd = dateToYmd(record.expectedDate, timeZone);
  if (!expectedYmd) {
    return null;
  }
  const todayYmd = options.todayYmd;
  if (
    todayYmd &&
    CALENDAR_ROLL_FORWARD_TYPES.has(record.type) &&
    expectedYmd < todayYmd
  ) {
    return todayYmd;
  }
  return expectedYmd;
}

export function buildCalendarEntriesForFinancialRecord(record, options = {}) {
  if (!record.expectedDate || record.status === "settled") {
    return [];
  }
  if (Number(record.outstandingBalance) <= 0) {
    return [];
  }

  const ymd = financialCalendarDisplayYmd(record, options);
  if (!ymd) {
    return [];
  }

  const { monthFirstYmd, monthLastYmd } = options;
  if (monthFirstYmd && monthLastYmd && (ymd < monthFirstYmd || ymd > monthLastYmd)) {
    return [];
  }

  const typeLabel = FINANCIAL_TYPE_LABEL[record.type] || record.type;

  return [
    {
      recordId: String(record._id),
      title: `${record.partyName} · ${typeLabel}`,
      kind: "financialExpected",
      ymd,
      time: null,
      status: record.status,
      href: `/financial-records/${record._id}`,
      marker: "financial",
    },
  ];
}

export function indexFinancialEntriesByYmd(records, options = {}) {
  const byDay = {};
  for (const record of records) {
    for (const entry of buildCalendarEntriesForFinancialRecord(record, options)) {
      if (!byDay[entry.ymd]) {
        byDay[entry.ymd] = [];
      }
      byDay[entry.ymd].push(entry);
    }
  }
  return byDay;
}

export function mergeCalendarDayMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    for (const [ymd, entries] of Object.entries(map || {})) {
      if (!merged[ymd]) {
        merged[ymd] = [];
      }
      merged[ymd].push(...entries);
    }
  }
  for (const ymd of Object.keys(merged)) {
    merged[ymd].sort((a, b) => a.title.localeCompare(b.title));
  }
  return merged;
}
