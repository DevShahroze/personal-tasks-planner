import {
  TASK_DECISION_STATUSES,
  TASK_INTENTS,
  DEFAULT_TASK_CURRENCY,
} from "./constants.js";
import { roundMoney } from "../finance/balance.js";

const MAX_MONEY = 999_999_999_999.99;

function parseOptionalMoney(value, fieldName, errors) {
  if (value === null || value === "") {
    return null;
  }
  const num = roundMoney(value);
  if (!Number.isFinite(Number(value)) || num <= 0 || num > MAX_MONEY) {
    errors.push(`Invalid ${fieldName}`);
    return null;
  }
  return num;
}

export function applyTaskCommerceToCreate(body, value) {
  value.intent = TASK_INTENTS.includes(body.intent) ? body.intent : "none";
  value.decisionStatus = TASK_DECISION_STATUSES.includes(body.decisionStatus)
    ? body.decisionStatus
    : "considering";
  value.estimatedValue =
    body.estimatedValue === undefined ||
    body.estimatedValue === null ||
    body.estimatedValue === ""
      ? null
      : (parseOptionalMoney(body.estimatedValue, "estimated value", []) ?? null);
  value.actualValue =
    body.actualValue === undefined ||
    body.actualValue === null ||
    body.actualValue === ""
      ? null
      : (parseOptionalMoney(body.actualValue, "actual value", []) ?? null);
  value.amountSpent =
    body.amountSpent === undefined ||
    body.amountSpent === null ||
    body.amountSpent === ""
      ? null
      : (parseOptionalMoney(body.amountSpent, "amount spent", []) ?? null);
  value.currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().slice(0, 8).toUpperCase()
      : DEFAULT_TASK_CURRENCY;
}

export function applyTaskCommercePatch(body, patch, errors) {
  if (body.intent !== undefined) {
    if (!TASK_INTENTS.includes(body.intent)) {
      errors.push("Invalid purchase/sale intent");
    } else {
      patch.intent = body.intent;
    }
  }

  if (body.decisionStatus !== undefined) {
    if (!TASK_DECISION_STATUSES.includes(body.decisionStatus)) {
      errors.push("Invalid decision status");
    } else {
      patch.decisionStatus = body.decisionStatus;
    }
  }

  if (body.estimatedValue !== undefined) {
    if (body.estimatedValue === null || body.estimatedValue === "") {
      patch.estimatedValue = null;
    } else {
      patch.estimatedValue = parseOptionalMoney(
        body.estimatedValue,
        "estimated value",
        errors,
      );
    }
  }

  if (body.actualValue !== undefined) {
    if (body.actualValue === null || body.actualValue === "") {
      patch.actualValue = null;
    } else {
      patch.actualValue = parseOptionalMoney(body.actualValue, "actual value", errors);
    }
  }

  if (body.amountSpent !== undefined) {
    if (body.amountSpent === null || body.amountSpent === "") {
      patch.amountSpent = null;
    } else {
      patch.amountSpent = parseOptionalMoney(body.amountSpent, "amount spent", errors);
    }
  }

  if (body.currency !== undefined) {
    patch.currency =
      typeof body.currency === "string" && body.currency.trim()
        ? body.currency.trim().slice(0, 8).toUpperCase()
        : DEFAULT_TASK_CURRENCY;
  }
}
