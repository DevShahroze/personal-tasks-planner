import { sumPayments, roundMoney, validatePaymentAmount } from "../finance/balance.js";

export function syncTaskAmountSpentFromPayments(payments) {
  const total = sumPayments(payments);
  return total > 0 ? total : null;
}

export function commercePaymentHeadroom(estimatedValue, payments) {
  if (estimatedValue == null || estimatedValue === "") {
    return null;
  }
  const original = roundMoney(estimatedValue);
  const paid = sumPayments(payments);
  return roundMoney(Math.max(0, original - paid));
}

export function validateTaskCommercePaymentAmount(amount, estimatedValue, payments) {
  const headroom = commercePaymentHeadroom(estimatedValue, payments);
  if (headroom === null) {
    return validatePaymentAmount(amount, Number.MAX_SAFE_INTEGER);
  }
  const capped = validatePaymentAmount(amount, headroom);
  if (!capped.ok && capped.error === "Payment exceeds outstanding balance") {
    return { ok: false, error: "Payment exceeds remaining order total (estimated)" };
  }
  return capped;
}
