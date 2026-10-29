import { roundMoney } from "../finance/balance.js";
import { INSTALLMENT_LOG_PAYMENT_KINDS } from "./constants.js";

export { INSTALLMENT_LOG_PAYMENT_KINDS };

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

export function paymentKindFromNote(note) {
  const trimmed = (note || "").trim();
  if (trimmed === "Down payment") {
    return "down_payment";
  }
  if (trimmed === "Balloon payment") {
    return "balloon";
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
