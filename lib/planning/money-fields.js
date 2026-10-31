import { roundMoney } from "../finance/balance.js";

export const MAX_MONEY_AMOUNT = 999_999_999_999.99;
export const MIN_MONEY_AMOUNT = 0.01;
export const MAX_PREPAID_PAYMENTS = 120;

/** Strip comma thousand separators (e.g. 52,800 → 52800). */
export function normalizeMoneyInputString(value) {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return String(value).trim().replace(/,/g, "");
}

export function moneyHasAtMostTwoDecimals(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  const text =
    typeof value === "number" ? String(value) : normalizeMoneyInputString(value);
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return false;
  }
  const fraction = text.split(".")[1];
  return !fraction || fraction.length <= 2;
}

/**
 * @param {unknown} value
 * @param {string} label
 * @param {string[]} errors
 * @param {{ required?: boolean, max?: number, min?: number }} [options]
 * @returns {number | null}
 */
export function parseMoneyInput(value, label, errors, options = {}) {
  const { required = false, max = MAX_MONEY_AMOUNT, min = MIN_MONEY_AMOUNT } = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${label} is required`);
    }
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    if (required) {
      errors.push(`${label} is required`);
    }
    return null;
  }

  if (!moneyHasAtMostTwoDecimals(value)) {
    errors.push(`${label} must use at most 2 decimal places`);
    return null;
  }

  const normalized =
    typeof value === "number" ? value : normalizeMoneyInputString(value);
  const raw = Number(normalized);
  if (!Number.isFinite(raw)) {
    errors.push(`${label} must be a valid number`);
    return null;
  }

  if (raw <= 0) {
    errors.push(`${label} must be greater than zero`);
    return null;
  }

  const rounded = roundMoney(raw);
  if (rounded < min) {
    errors.push(`${label} must be at least ${min}`);
    return null;
  }
  if (rounded > max) {
    errors.push(`${label} must not exceed ${max}`);
    return null;
  }

  return rounded;
}

export function parseOptionalPositiveInt(value, label, errors, { max = 10_000 } = {}) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    errors.push(`${label} must be a whole number of at least 1`);
    return null;
  }
  if (num > max) {
    errors.push(`${label} must not exceed ${max}`);
    return null;
  }
  return num;
}

export function parseCustomIntervalDays(frequency, value, errors) {
  if (frequency !== "custom") {
    return null;
  }
  if (value === undefined || value === null || value === "") {
    errors.push("Custom frequency requires interval days");
    return null;
  }
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    errors.push("Custom interval must be between 1 and 3650 days");
    return null;
  }
  return days;
}

export function assertDateOnOrAfter(startDate, endDate, label, errors) {
  if (!startDate || !endDate) {
    return;
  }
  if (endDate < startDate) {
    errors.push(`${label} must be on or after the start date`);
  }
}

export function formatValidationErrors(errors) {
  return (errors || []).filter(Boolean).join(" ");
}
