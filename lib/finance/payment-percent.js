import { roundMoney } from "./balance.js";

export function formatPaymentPercentDisplay(percent) {
  if (!Number.isFinite(percent)) {
    return "";
  }
  const rounded = Math.round(percent * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return rounded.toFixed(2).replace(/\.?0+$/, "");
}

/** Payment amount from percent of the outstanding balance (percent 0–100). */
export function paymentAmountFromOutstandingPercent(percent, outstandingBalance) {
  const base = roundMoney(outstandingBalance);
  if (base <= 0) {
    return null;
  }
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0) {
    return null;
  }
  const clamped = Math.min(100, pct);
  const amount = roundMoney((clamped / 100) * base);
  return amount > 0 ? amount : null;
}

/** Percent of outstanding balance for a payment amount (0–100). */
export function paymentPercentFromAmount(amount, outstandingBalance) {
  const base = roundMoney(outstandingBalance);
  if (base <= 0) {
    return null;
  }
  const parsed = roundMoney(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  const percent = (parsed / base) * 100;
  return Math.min(100, Math.round(percent * 100) / 100);
}
