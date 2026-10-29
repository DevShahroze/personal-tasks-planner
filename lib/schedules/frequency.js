import { addIntervalToYmd } from "../recurrence/calculate.js";

export const PAYMENT_FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly", "custom"];

export function frequencyToStep(frequency, customIntervalDays) {
  switch (frequency) {
    case "weekly":
      return { interval: 1, unit: "weeks" };
    case "monthly":
      return { interval: 1, unit: "months" };
    case "quarterly":
      return { interval: 3, unit: "months" };
    case "yearly":
      return { interval: 1, unit: "years" };
    case "custom":
      return { interval: Math.max(1, Number(customIntervalDays) || 30), unit: "days" };
    default:
      return { interval: 1, unit: "months" };
  }
}

export function advanceYmdByFrequency(ymd, frequency, customIntervalDays) {
  const step = frequencyToStep(frequency, customIntervalDays);
  return addIntervalToYmd(ymd, step.interval, step.unit);
}

export function computeNextDueYmd({
  startYmd,
  endYmd,
  frequency,
  customIntervalDays,
  anchorYmd,
  todayYmd,
}) {
  if (!startYmd) {
    return null;
  }
  let cursor = anchorYmd || startYmd;
  if (cursor < startYmd) {
    cursor = startYmd;
  }
  let next = cursor;
  let guard = 0;
  while (guard < 500) {
    guard += 1;
    if (todayYmd && next >= todayYmd) {
      if (endYmd && next > endYmd) {
        return null;
      }
      return next;
    }
    const advanced = advanceYmdByFrequency(next, frequency, customIntervalDays);
    if (!advanced || advanced === next) {
      return null;
    }
    next = advanced;
    if (endYmd && next > endYmd) {
      return null;
    }
  }
  return null;
}

export function ymdRangeInclusive(startYmd, endYmd) {
  if (!startYmd || !endYmd || endYmd < startYmd) {
    return [];
  }
  const days = [];
  let cursor = startYmd;
  let guard = 0;
  while (cursor && cursor <= endYmd && guard < 400) {
    days.push(cursor);
    const next = advanceYmdByFrequency(cursor, "custom", 1);
    if (!next || next === cursor) {
      break;
    }
    cursor = next;
    guard += 1;
  }
  return days;
}

export function inclusiveDurationDays(startYmd, endYmd) {
  if (!startYmd || !endYmd) {
    return null;
  }
  return ymdRangeInclusive(startYmd, endYmd).length || null;
}
