import { roundMoney } from "../finance/balance.js";

const MAX_PAYMENT_NOTE_LENGTH = 2000;
const MAX_MONEY = 999_999_999_999.99;

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function parseOptionalMoney(value, fieldName, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${fieldName} is required`);
    }
    return null;
  }
  const num = roundMoney(value);
  if (!Number.isFinite(Number(value)) || num <= 0 || num > MAX_MONEY) {
    errors.push(`Invalid ${fieldName}`);
    return null;
  }
  return num;
}

function parseOptionalDate(value, fieldName, errors) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`Invalid ${fieldName}`);
    return null;
  }
  return date;
}

export function validatePaymentCreate(body) {
  const errors = [];
  const amount = parseOptionalMoney(body.amount, "amount", errors, { required: true });
  const paidAt = parseOptionalDate(body.paidAt, "payment date", errors) || new Date();
  const note = limitString(body.note, MAX_PAYMENT_NOTE_LENGTH);

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: { amount, paidAt, note },
  };
}
