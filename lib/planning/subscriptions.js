import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { computeNextDueYmd } from "../schedules/frequency.js";
import { nextDueDateAfterPrepaid } from "./prepaid-payments.js";

export function recomputeSubscriptionNextBilling(doc) {
  if (doc.manualBilling || doc.manualNextBillingDate) {
    return doc;
  }
  if (doc.paymentHistory?.length) {
    doc.nextBillingDate = nextDueDateAfterPrepaid({
      payments: doc.paymentHistory,
      startDate: doc.startDate,
      frequency: doc.billingFrequency,
      customIntervalDays: doc.customIntervalDays,
    });
  } else {
    doc.nextBillingDate = null;
  }
  return doc;
}

export function syncSubscription(doc, todayYmd) {
  if (
    doc.status === "cancelled" ||
    doc.status === "expired" ||
    doc.status === "paused"
  ) {
    return doc;
  }

  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;

  if (doc.cancellationDate && todayYmd) {
    const cancelYmd = dateToYmd(doc.cancellationDate, timeZone);
    if (cancelYmd && cancelYmd <= todayYmd) {
      doc.status = "cancelled";
      doc.autoRenew = false;
      return doc;
    }
  }

  if (doc.manualBilling || doc.manualNextBillingDate) {
    if (
      doc.status !== "cancelled" &&
      doc.status !== "expired" &&
      doc.status !== "paused"
    ) {
      doc.status = "active";
    }
    return doc;
  }

  const startYmd = dateToYmd(doc.startDate, timeZone);
  const endYmd = doc.cancellationDate
    ? dateToYmd(doc.cancellationDate, timeZone)
    : null;

  if (!doc.nextBillingDate && startYmd) {
    const nextYmd = computeNextDueYmd({
      startYmd,
      endYmd,
      frequency: doc.billingFrequency,
      customIntervalDays: doc.customIntervalDays,
      anchorYmd: startYmd,
      todayYmd: todayYmd || startYmd,
    });
    if (nextYmd) {
      doc.nextBillingDate = new Date(`${nextYmd}T12:00:00.000Z`);
    }
  }

  if (
    doc.status !== "cancelled" &&
    doc.status !== "expired" &&
    doc.status !== "paused"
  ) {
    doc.status = "active";
  }

  return doc;
}
