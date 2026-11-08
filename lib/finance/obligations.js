import { roundMoney } from "./balance.js";
import { formatCurrency } from "../format.js";

const RECEIVE_TYPES = new Set(["receivable", "money_lent"]);
const PAY_TYPES = new Set(["payable", "money_borrowed"]);

export function financialObligationDirection(type) {
  if (RECEIVE_TYPES.has(type)) {
    return "receive";
  }
  if (PAY_TYPES.has(type)) {
    return "pay";
  }
  return null;
}

export function financialObligationHeading(type) {
  const direction = financialObligationDirection(type);
  if (direction === "receive") {
    return "Amount to receive";
  }
  if (direction === "pay") {
    return "Amount to pay";
  }
  return "Outstanding";
}

export function describeFinancialObligation(record) {
  const outstanding = roundMoney(record?.outstandingBalance);
  const currency = record?.currency || "PKR";
  const direction = financialObligationDirection(record?.type);
  const settled = record?.status === "settled" || outstanding <= 0;

  if (settled || !direction) {
    return {
      direction,
      settled: true,
      heading: financialObligationHeading(record?.type),
      label: settled ? "Settled — nothing owed" : "—",
      shortLabel: settled ? "Settled" : "—",
      amount: 0,
      currency,
    };
  }

  const amountLabel = formatCurrency(outstanding, currency);
  const label =
    direction === "receive"
      ? `You should receive ${amountLabel}`
      : `You should pay ${amountLabel}`;

  return {
    direction,
    settled: false,
    heading: financialObligationHeading(record?.type),
    label,
    shortLabel:
      direction === "receive" ? `Receive ${amountLabel}` : `Pay ${amountLabel}`,
    amount: outstanding,
    currency,
  };
}

export function mergeObligationTotals(rows) {
  const byCurrency = new Map();
  for (const row of rows || []) {
    const currency = row.currency || "PKR";
    const current = byCurrency.get(currency) || { currency, toReceive: 0, toPay: 0 };
    current.toReceive = roundMoney(current.toReceive + (row.toReceive || 0));
    current.toPay = roundMoney(current.toPay + (row.toPay || 0));
    byCurrency.set(currency, current);
  }
  return [...byCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
