export function roundMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.round(num * 100) / 100;
}

export function sumPayments(payments) {
  return roundMoney(
    (payments || []).reduce((total, payment) => total + roundMoney(payment.amount), 0),
  );
}

export function computeOutstandingBalance(originalAmount, payments) {
  const original = roundMoney(originalAmount);
  const paid = sumPayments(payments);
  return roundMoney(Math.max(0, original - paid));
}

export function deriveFinancialStatus(originalAmount, outstandingBalance) {
  const original = roundMoney(originalAmount);
  const balance = roundMoney(outstandingBalance);
  if (balance <= 0) {
    return "settled";
  }
  if (balance >= original) {
    return "pending";
  }
  return "partially_paid";
}

function paymentAmountDecimalsOk(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  const text = typeof value === "number" ? String(value) : String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return false;
  }
  const fraction = text.split(".")[1];
  return !fraction || fraction.length <= 2;
}

export function validatePaymentAmount(amount, outstandingBalance) {
  if (!paymentAmountDecimalsOk(amount)) {
    return {
      ok: false,
      error: "Payment amount must be a positive number with at most 2 decimal places",
    };
  }
  const parsed = roundMoney(amount);
  if (!Number.isFinite(Number(amount)) || parsed <= 0) {
    return { ok: false, error: "Payment amount must be greater than zero" };
  }
  if (parsed > roundMoney(outstandingBalance)) {
    return { ok: false, error: "Payment exceeds outstanding balance" };
  }
  return { ok: true, value: parsed };
}

export function isFinancialOverdue(expectedDate, outstandingBalance, status, todayYmd) {
  if (!expectedDate || status === "settled" || roundMoney(outstandingBalance) <= 0) {
    return false;
  }
  if (!todayYmd) {
    return false;
  }
  const expectedYmd =
    expectedDate instanceof Date
      ? expectedDate.toISOString().slice(0, 10)
      : String(expectedDate).slice(0, 10);
  return expectedYmd < todayYmd;
}
