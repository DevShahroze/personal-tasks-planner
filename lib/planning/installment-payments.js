import { roundMoney } from "../finance/balance.js";
import { INSTALLMENT_LOG_PAYMENT_KINDS } from "./constants.js";

export { INSTALLMENT_LOG_PAYMENT_KINDS };

export function installmentPaidNoteText(index, totalInstallments) {
  if (totalInstallments != null && totalInstallments > 0) {
    return `Installment paid (${index}/${totalInstallments})`;
  }
  return `Installment paid (${index})`;
}

export function normalizeInstallmentPaymentNotes(doc) {
  const total = doc.totalInstallments;
  if (total == null || total <= 0 || !doc.payments?.length) {
    return;
  }
  let index = 0;
  for (const payment of doc.payments) {
    if (!paymentCountsTowardInstallmentsPaid(payment)) {
      continue;
    }
    index += 1;
    payment.note = installmentPaidNoteText(index, total);
  }
}

export function installmentPaymentNoteForKind(kind) {
  switch (kind) {
    case "down_payment":
      return "Down payment";
    case "balloon":
      return "Balloon payment";
    default:
      return "Installment";
  }
}

export function installmentPaymentNoteForLog(record, kind) {
  switch (kind) {
    case "down_payment":
      return "Down payment";
    case "balloon":
      return "Balloon payment";
    default: {
      const index = countPaymentsTowardInstallmentsPaid(record.payments) + 1;
      return installmentPaidNoteText(index, record.totalInstallments);
    }
  }
}

export function paymentKindFromNote(note) {
  const trimmed = (note || "").trim();
  if (trimmed === "Down payment") {
    return "down_payment";
  }
  if (trimmed === "Balloon payment") {
    return "balloon";
  }
  if (/lump sum/i.test(trimmed)) {
    return "lump_sum";
  }
  return "installment";
}

export function paymentCountsTowardInstallmentsPaid(payment) {
  const kind = paymentKindFromNote(payment.note);
  return kind === "installment";
}

export function sumPaymentsTowardInstallmentsPaid(payments) {
  return roundMoney(
    (payments || []).reduce((sum, payment) => {
      if (!paymentCountsTowardInstallmentsPaid(payment)) {
        return sum;
      }
      return sum + Number(payment.amount);
    }, 0),
  );
}

export function countPaymentsTowardInstallmentsPaid(payments) {
  return (payments || []).filter(paymentCountsTowardInstallmentsPaid).length;
}
