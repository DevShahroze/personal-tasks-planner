import { roundMoney, sumPayments } from "../finance/balance.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { advanceYmdByFrequency } from "../schedules/frequency.js";
import {
  countPaymentsTowardInstallmentsPaid,
  normalizeInstallmentPaymentNotes,
  sumPaymentsTowardInstallmentsPaid,
} from "./installment-payments.js";
import { installmentIsOpenEnded } from "./installment-display.js";
import { sortPaymentsByPaidAtInPlace } from "../payments/sort.js";

export { installmentIsOpenEnded, installmentTotalPaid } from "./installment-display.js";

/** Next billing period from start date after each logged installment payment. */
function nextUnpaidPeriodYmd(doc, timeZone) {
  const startYmd = doc.startDate ? dateToYmd(doc.startDate, timeZone) : null;
  if (!startYmd) {
    return null;
  }
  const paid = countPaymentsTowardInstallmentsPaid(doc.payments);
  let ymd = startYmd;
  for (let i = 0; i < paid; i += 1) {
    const advanced = advanceYmdByFrequency(ymd, doc.frequency, doc.customIntervalDays);
    if (!advanced || advanced === ymd) {
      break;
    }
    ymd = advanced;
  }
  return ymd;
}

function applyScheduledNextDue(doc, timeZone, endYmd) {
  doc.manualNextDueDate = false;
  let nextYmd = nextUnpaidPeriodYmd(doc, timeZone);
  if (endYmd && nextYmd && nextYmd > endYmd) {
    nextYmd = null;
  }
  if (
    doc.totalInstallments &&
    countPaymentsTowardInstallmentsPaid(doc.payments) >= doc.totalInstallments
  ) {
    nextYmd = null;
  }
  doc.nextDueDate = nextYmd ? new Date(`${nextYmd}T12:00:00.000Z`) : null;
}

function syncInstallmentNextDue(doc, todayYmd) {
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const startYmd = doc.startDate ? dateToYmd(doc.startDate, timeZone) : null;
  const endYmd = doc.endDate ? dateToYmd(doc.endDate, timeZone) : null;

  if (installmentIsOpenEnded(doc)) {
    applyScheduledNextDue(doc, timeZone, endYmd);
  } else if (startYmd) {
    applyScheduledNextDue(doc, timeZone, endYmd);
  }

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
    doc.status !== "overdue" &&
    doc.status !== "paused"
  ) {
    doc.status = "active";
  }
}

export function syncInstallmentCommitment(doc, todayYmd) {
  sortPaymentsByPaidAtInPlace(doc.payments);
  normalizeInstallmentPaymentNotes(doc);

  if (doc.status === "cancelled") {
    return doc;
  }

  if (installmentIsOpenEnded(doc)) {
    doc.outstandingBalance = 0;
    doc.installmentsPaid = countPaymentsTowardInstallmentsPaid(doc.payments);
    if (doc.totalInstallments && doc.installmentsPaid >= doc.totalInstallments) {
      doc.status = "completed";
      doc.nextDueDate = null;
      return doc;
    }
    if (doc.status === "paused") {
      return doc;
    }
    syncInstallmentNextDue(doc, todayYmd);
    return doc;
  }

  const totalAmount = roundMoney(doc.totalAmount);
  const paid = sumPayments(doc.payments);
  doc.outstandingBalance = roundMoney(Math.max(0, totalAmount - paid));

  const installmentAmount = roundMoney(doc.installmentAmount);
  const towardInstallments = sumPaymentsTowardInstallmentsPaid(doc.payments);
  doc.installmentsPaid =
    installmentAmount > 0
      ? Math.floor(towardInstallments / installmentAmount)
      : countPaymentsTowardInstallmentsPaid(doc.payments);

  if (doc.outstandingBalance <= 0) {
    doc.status = "completed";
    doc.nextDueDate = null;
    return doc;
  }

  if (doc.status === "paused") {
    return doc;
  }

  syncInstallmentNextDue(doc, todayYmd);
  return doc;
}
