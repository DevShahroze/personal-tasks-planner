import { roundMoney, sumPayments } from "../finance/balance.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { computeNextDueYmd } from "../schedules/frequency.js";
import {
  countPaymentsTowardInstallmentsPaid,
  sumPaymentsTowardInstallmentsPaid,
} from "./installment-payments.js";
import { sortPaymentsByPaidAtInPlace } from "../payments/mongoose.js";

export function syncInstallmentCommitment(doc, todayYmd) {
  sortPaymentsByPaidAtInPlace(doc.payments);
  const totalAmount = roundMoney(doc.totalAmount);
  const paid = sumPayments(doc.payments);
  doc.outstandingBalance = roundMoney(Math.max(0, totalAmount - paid));

  const installmentAmount = roundMoney(doc.installmentAmount);
  const towardInstallments = sumPaymentsTowardInstallmentsPaid(doc.payments);
  doc.installmentsPaid =
    installmentAmount > 0
      ? Math.floor(towardInstallments / installmentAmount)
      : countPaymentsTowardInstallmentsPaid(doc.payments);

  if (doc.status === "cancelled") {
    return doc;
  }

  if (doc.outstandingBalance <= 0) {
    doc.status = "completed";
    doc.nextDueDate = null;
    return doc;
  }

  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const startYmd = dateToYmd(doc.startDate, timeZone);
  const endYmd = doc.endDate ? dateToYmd(doc.endDate, timeZone) : null;
  const lastPayment = doc.payments?.length
    ? doc.payments[doc.payments.length - 1]
    : null;
  const anchorYmd = lastPayment ? dateToYmd(lastPayment.paidAt, timeZone) : startYmd;

  const nextYmd = computeNextDueYmd({
    startYmd,
    endYmd,
    frequency: doc.frequency,
    customIntervalDays: doc.customIntervalDays,
    anchorYmd,
    todayYmd: todayYmd || startYmd,
  });

  doc.nextDueDate = nextYmd
    ? new Date(`${nextYmd}T12:00:00.000Z`)
    : doc.nextDueDate || doc.startDate;

  if (todayYmd && doc.nextDueDate) {
    const dueYmd = dateToYmd(doc.nextDueDate, timeZone);
    if (dueYmd && dueYmd < todayYmd && doc.status !== "completed") {
      doc.status = "overdue";
    } else if (doc.status === "overdue") {
      doc.status = "active";
    }
  }

  if (
    doc.status !== "completed" &&
    doc.status !== "cancelled" &&
    doc.status !== "overdue"
  ) {
    doc.status = "active";
  }

  return doc;
}
