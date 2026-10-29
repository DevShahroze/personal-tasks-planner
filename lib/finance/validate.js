import mongoose from "mongoose";
import {
  FINANCIAL_RECORD_STATUSES,
  FINANCIAL_RECORD_TYPES,
  DEFAULT_FINANCIAL_CURRENCY,
} from "./constants.js";
import { roundMoney } from "./balance.js";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../security/constants.js";
const MAX_PARTY_NAME_LENGTH = 200;
const MAX_FINANCIAL_NOTES_LENGTH = MAX_DESCRIPTION_LENGTH;
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

export function validateFinancialRecordCreate(body) {
  const errors = [];
  const type = body.type;
  if (!FINANCIAL_RECORD_TYPES.includes(type)) {
    errors.push("Invalid financial record type");
  }

  const partyName = limitString(body.partyName, MAX_PARTY_NAME_LENGTH);
  if (!partyName) {
    errors.push("Party name is required");
  }

  const originalAmount = parseOptionalMoney(
    body.originalAmount,
    "original amount",
    errors,
    {
      required: true,
    },
  );

  let taskId = body.taskId || null;
  if (taskId) {
    if (!mongoose.Types.ObjectId.isValid(String(taskId))) {
      errors.push("Invalid linked task");
      taskId = null;
    }
  } else {
    taskId = null;
  }

  const currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().slice(0, 8).toUpperCase()
      : DEFAULT_FINANCIAL_CURRENCY;

  const expectedDate = parseOptionalDate(body.expectedDate, "expected date", errors);

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: {
      type,
      partyName,
      description: limitString(body.description, MAX_DESCRIPTION_LENGTH),
      originalAmount,
      outstandingBalance: originalAmount,
      currency,
      expectedDate,
      status: "pending",
      notes: limitString(body.notes, MAX_FINANCIAL_NOTES_LENGTH),
      taskId,
      payments: [],
    },
  };
}

export function validateFinancialRecordUpdate(body) {
  const patch = {};
  const errors = [];

  if (body.type !== undefined) {
    if (!FINANCIAL_RECORD_TYPES.includes(body.type)) {
      errors.push("Invalid financial record type");
    } else {
      patch.type = body.type;
    }
  }

  if (body.partyName !== undefined) {
    const partyName = limitString(body.partyName, MAX_PARTY_NAME_LENGTH);
    if (!partyName) {
      errors.push("Party name cannot be empty");
    } else {
      patch.partyName = partyName;
    }
  }

  if (body.description !== undefined) {
    patch.description = limitString(body.description, MAX_DESCRIPTION_LENGTH);
  }

  if (body.notes !== undefined) {
    patch.notes = limitString(body.notes, MAX_FINANCIAL_NOTES_LENGTH);
  }

  if (body.currency !== undefined) {
    patch.currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().slice(0, 8).toUpperCase()
        : DEFAULT_FINANCIAL_CURRENCY;
  }

  if (body.expectedDate !== undefined) {
    patch.expectedDate = body.expectedDate
      ? parseOptionalDate(body.expectedDate, "expected date", errors)
      : null;
  }

  if (body.taskId !== undefined) {
    if (body.taskId === null || body.taskId === "") {
      patch.taskId = null;
    } else if (!mongoose.Types.ObjectId.isValid(String(body.taskId))) {
      errors.push("Invalid linked task");
    } else {
      patch.taskId = body.taskId;
    }
  }

  if (body.originalAmount !== undefined) {
    errors.push("Original amount cannot be changed after creation");
  }

  if (body.outstandingBalance !== undefined) {
    errors.push("Outstanding balance is calculated from payments");
  }

  if (body.status !== undefined) {
    errors.push("Status is derived from payments");
  }

  if (body.payments !== undefined) {
    errors.push("Use the payments endpoint to record payments");
  }

  return { ok: !errors.length, errors, patch };
}

export function validateFinancialPaymentCreate(body) {
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
