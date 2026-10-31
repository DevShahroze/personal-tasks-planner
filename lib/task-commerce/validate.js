import {
  TASK_DECISION_STATUSES,
  TASK_INTENTS,
  DEFAULT_TASK_CURRENCY,
} from "./constants.js";
import { parseMoneyInput } from "../planning/money-fields.js";
import { parseOptionalTaskDate } from "./dates.js";

function parseOptionalMoney(value, fieldName, errors) {
  return parseMoneyInput(value, fieldName, errors, { required: false });
}

function applyOrderDates(body, target, errors) {
  const orderPlacedDate = parseOptionalTaskDate(
    body.orderPlacedDate,
    "order placed date",
    errors,
  );
  const expectedReceiveDate = parseOptionalTaskDate(
    body.expectedReceiveDate,
    "expected receive date",
    errors,
  );
  const receivedDate = parseOptionalTaskDate(
    body.receivedDate,
    "received date",
    errors,
  );

  if (
    orderPlacedDate &&
    expectedReceiveDate &&
    orderPlacedDate.getTime() > expectedReceiveDate.getTime()
  ) {
    errors.push("Order placed date cannot be after expected receive date");
  }

  target.orderPlacedDate = orderPlacedDate;
  target.expectedReceiveDate = expectedReceiveDate;
  target.receivedDate = receivedDate;
}

function applyOrderDatesPatch(body, patch, errors) {
  if (
    body.orderPlacedDate === undefined &&
    body.expectedReceiveDate === undefined &&
    body.receivedDate === undefined
  ) {
    return;
  }

  const orderPlacedDate =
    body.orderPlacedDate !== undefined
      ? parseOptionalTaskDate(body.orderPlacedDate, "order placed date", errors)
      : undefined;
  const expectedReceiveDate =
    body.expectedReceiveDate !== undefined
      ? parseOptionalTaskDate(body.expectedReceiveDate, "expected receive date", errors)
      : undefined;
  const receivedDate =
    body.receivedDate !== undefined
      ? parseOptionalTaskDate(body.receivedDate, "received date", errors)
      : undefined;

  if (body.orderPlacedDate !== undefined) {
    patch.orderPlacedDate = orderPlacedDate;
  }
  if (body.expectedReceiveDate !== undefined) {
    patch.expectedReceiveDate = expectedReceiveDate;
  }
  if (body.receivedDate !== undefined) {
    patch.receivedDate = receivedDate;
  }

  const placed = patch.orderPlacedDate;
  const expected = patch.expectedReceiveDate;
  if (placed && expected && placed.getTime() > expected.getTime()) {
    errors.push("Order placed date cannot be after expected receive date");
  }
}

export function applyTaskCommerceToCreate(body, value, errors = []) {
  value.intent = TASK_INTENTS.includes(body.intent) ? body.intent : "none";
  value.decisionStatus = TASK_DECISION_STATUSES.includes(body.decisionStatus)
    ? body.decisionStatus
    : "considering";
  value.estimatedValue =
    body.estimatedValue === undefined ||
    body.estimatedValue === null ||
    body.estimatedValue === ""
      ? null
      : parseOptionalMoney(body.estimatedValue, "estimated value", errors);
  value.actualValue =
    body.actualValue === undefined ||
    body.actualValue === null ||
    body.actualValue === ""
      ? null
      : parseOptionalMoney(body.actualValue, "actual value", errors);
  value.amountSpent =
    body.amountSpent === undefined ||
    body.amountSpent === null ||
    body.amountSpent === ""
      ? null
      : parseOptionalMoney(body.amountSpent, "amount spent", errors);
  value.currency =
    typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().slice(0, 8).toUpperCase()
      : DEFAULT_TASK_CURRENCY;
  applyOrderDates(body, value, errors);
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

  applyOrderDatesPatch(body, patch, errors);
}
