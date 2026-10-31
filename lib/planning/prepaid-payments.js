import { roundMoney } from "../finance/balance.js";
import {
  moneyHasAtMostTwoDecimals,
  normalizeMoneyInputString,
} from "./money-fields.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { advanceYmdByFrequency } from "../schedules/frequency.js";

export const MAX_PREPAID_PAYMENTS = 120;

export function parsePrepaidPaymentsCount(value, errors) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > MAX_PREPAID_PAYMENTS) {
    errors.push(`Already-paid count must be between 0 and ${MAX_PREPAID_PAYMENTS}`);
    return 0;
  }
  return count;
}

export function parsePrepaidPaymentAmounts(value, errors) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parts = splitPrepaidAmountTokens(value);
  if (!parts.length) {
    return null;
  }
  if (parts.length > MAX_PREPAID_PAYMENTS) {
    errors.push(`At most ${MAX_PREPAID_PAYMENTS} prepaid amounts allowed`);
    return null;
  }
  const amounts = [];
  for (const part of parts) {
    const token = normalizeMoneyInputString(part);
    if (!moneyHasAtMostTwoDecimals(token)) {
      errors.push("Each prepaid amount must use at most 2 decimal places");
      return null;
    }
    const amount = roundMoney(token);
    if (!Number.isFinite(Number(token)) || amount <= 0) {
      errors.push("Each prepaid amount must be a positive number");
      return null;
    }
    amounts.push(amount);
  }
  return amounts;
}

function splitPrepaidAmountTokens(value) {
  if (Array.isArray(value)) {
    return value.map((part) => String(part).trim()).filter(Boolean);
  }
  const raw = String(value).trim();
  if (!raw) {
    return [];
  }
  if (raw.includes("\n")) {
    return raw
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const compact = raw.replace(/\s/g, "");
  if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(compact)) {
    return [compact];
  }
  return raw
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildPrepaidPaymentRecordsForAmounts({
  amounts,
  startDate,
  frequency,
  customIntervalDays,
  timeZone,
  notePrefix,
  noteDenominator,
}) {
  if (!amounts?.length) {
    return [];
  }
  let ymd = dateToYmd(startDate, timeZone);
  if (!ymd) {
    return [];
  }
  const count = amounts.length;
  const totalInNote = noteDenominator ?? count;
  const payments = [];
  for (let index = 0; index < count; index += 1) {
    payments.push({
      amount: amounts[index],
      paidAt: new Date(`${ymd}T12:00:00.000Z`),
      note: `${notePrefix} (${index + 1}/${totalInNote})`,
    });
    if (index < count - 1) {
      const nextYmd = advanceYmdByFrequency(ymd, frequency, customIntervalDays);
      if (!nextYmd || nextYmd === ymd) {
        break;
      }
      ymd = nextYmd;
    }
  }
  return payments;
}

export function buildPrepaidPaymentRecords({
  count,
  amountPerPayment,
  startDate,
  frequency,
  customIntervalDays,
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
  notePrefix = "Already paid",
  noteDenominator,
}) {
  if (!count || count <= 0) {
    return [];
  }
  const amount = roundMoney(amountPerPayment);
  if (amount <= 0) {
    return [];
  }

  let ymd = dateToYmd(startDate, timeZone);
  if (!ymd) {
    return [];
  }

  const totalInNote = noteDenominator ?? count;
  const payments = [];
  for (let index = 0; index < count; index += 1) {
    payments.push({
      amount,
      paidAt: new Date(`${ymd}T12:00:00.000Z`),
      note: `${notePrefix} (${index + 1}/${totalInNote})`,
    });
    if (index < count - 1) {
      const nextYmd = advanceYmdByFrequency(ymd, frequency, customIntervalDays);
      if (!nextYmd || nextYmd === ymd) {
        break;
      }
      ymd = nextYmd;
    }
  }
  return payments;
}

export function buildVariablePrepaidPaymentRecords(options) {
  return buildPrepaidPaymentRecordsForAmounts(options);
}

export function buildDownPaymentRecord({
  amount,
  paidAt,
  note = "Down payment",
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
}) {
  const value = roundMoney(amount);
  if (value <= 0) {
    return null;
  }
  const ymd = dateToYmd(paidAt, timeZone);
  if (!ymd) {
    return null;
  }
  return {
    amount: value,
    paidAt: new Date(`${ymd}T12:00:00.000Z`),
    note,
  };
}

/** One payment row for a single total already paid (not split by period). */
export function buildLumpSumPrepaidPayment({
  amount,
  startDate,
  notePrefix = "Already paid",
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
}) {
  const record = buildDownPaymentRecord({
    amount,
    paidAt: startDate,
    note: `${notePrefix} (lump sum)`,
    timeZone,
  });
  return record ? [record] : [];
}

export function countPrepaidInputModes({ lumpSum, variableAmounts, periodCount }) {
  let modes = 0;
  if (lumpSum != null && lumpSum > 0) {
    modes += 1;
  }
  if (variableAmounts?.length) {
    modes += 1;
  }
  if (periodCount > 0) {
    modes += 1;
  }
  return modes;
}

export function sumPrepaidAmount(payments) {
  return roundMoney(
    (payments || []).reduce((sum, payment) => sum + Number(payment.amount), 0),
  );
}

export function nextDueDateAfterPrepaid({
  payments,
  startDate,
  frequency,
  customIntervalDays,
  timeZone = DEFAULT_SCHEDULE_TIMEZONE,
}) {
  if (!payments?.length) {
    return null;
  }
  const lastYmd = dateToYmd(payments[payments.length - 1].paidAt, timeZone);
  if (!lastYmd) {
    return null;
  }
  const nextYmd = advanceYmdByFrequency(lastYmd, frequency, customIntervalDays);
  if (!nextYmd) {
    return null;
  }
  return new Date(`${nextYmd}T12:00:00.000Z`);
}
