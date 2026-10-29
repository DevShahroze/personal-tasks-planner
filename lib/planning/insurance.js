import { roundMoney, sumPayments } from "../finance/balance.js";
import { addIntervalToYmd, dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { computeNextDueYmd } from "../schedules/frequency.js";

export function applyInsuranceScheduleAfterPatch(doc) {
  if (doc.termYears && doc.startDate) {
    const startYmd = dateToYmd(doc.startDate, DEFAULT_SCHEDULE_TIMEZONE);
    const endYmd = addIntervalToYmd(startYmd, doc.termYears, "years");
    if (endYmd) {
      doc.endDate = new Date(`${endYmd}T12:00:00.000Z`);
    }
  }
  if (
    doc.premiumAmount &&
    doc.totalPremiumPayments &&
    doc.totalPremiumAmount <= doc.premiumAmount
  ) {
    doc.totalPremiumAmount = roundMoney(doc.premiumAmount * doc.totalPremiumPayments);
  }
  return doc;
}

export function syncInsurancePolicy(doc, todayYmd) {
  const totalPremiumAmount = roundMoney(doc.totalPremiumAmount);
  const paid = sumPayments(doc.payments);
  doc.outstandingBalance = roundMoney(Math.max(0, totalPremiumAmount - paid));

  const premiumAmount = roundMoney(doc.premiumAmount);
  doc.premiumsPaid =
    premiumAmount > 0 ? Math.floor(paid / premiumAmount) : (doc.payments?.length ?? 0);

  if (doc.status === "cancelled") {
    return doc;
  }

  if (doc.outstandingBalance <= 0) {
    doc.status = "completed";
    doc.nextDueDate = null;
    return doc;
  }

  if (
    doc.totalPremiumPayments &&
    doc.premiumsPaid >= doc.totalPremiumPayments &&
    doc.status !== "completed"
  ) {
    doc.status = "completed";
    doc.nextDueDate = null;
    doc.outstandingBalance = 0;
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
