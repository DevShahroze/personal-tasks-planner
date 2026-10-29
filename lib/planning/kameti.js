import { roundMoney, sumPayments } from "../finance/balance.js";
import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { computeNextDueYmd } from "../schedules/frequency.js";

export function expectedKametiContributions(doc) {
  if (!doc.totalParticipants || !doc.contributionAmount) {
    return null;
  }
  return roundMoney(doc.totalParticipants * doc.contributionAmount);
}

export function syncKametiPlan(doc, todayYmd) {
  const paid = sumPayments(doc.contributionPayments);
  const expectedPerCycle = roundMoney(doc.contributionAmount);
  const totalExpected = expectedKametiContributions(doc);

  if (totalExpected !== null) {
    doc.remainingContributionsOwed = roundMoney(Math.max(0, totalExpected - paid));
  } else {
    doc.remainingContributionsOwed = roundMoney(Math.max(0, (doc.remainingContributionsOwed ?? 0)));
  }

  if (doc.status === "cancelled") {
    return doc;
  }

  if (doc.payoutReceivedAt && doc.payoutAmount) {
    if (doc.remainingContributionsOwed <= 0) {
      doc.status = "completed";
    } else if (doc.status !== "overdue") {
      doc.status = "payout_received";
    }
  }

  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const startYmd = dateToYmd(doc.startDate, timeZone);
  const endYmd = doc.endDate ? dateToYmd(doc.endDate, timeZone) : null;
  const lastPayment = doc.contributionPayments?.length
    ? doc.contributionPayments[doc.contributionPayments.length - 1]
    : null;
  const anchorYmd = lastPayment
    ? dateToYmd(lastPayment.paidAt, timeZone)
    : startYmd;

  if (doc.remainingContributionsOwed > 0) {
    const nextYmd = computeNextDueYmd({
      startYmd,
      endYmd,
      frequency: doc.contributionFrequency,
      customIntervalDays: doc.customIntervalDays,
      anchorYmd,
      todayYmd: todayYmd || startYmd,
    });
    if (nextYmd) {
      doc.nextContributionDueDate = new Date(`${nextYmd}T12:00:00.000Z`);
    }
  } else {
    doc.nextContributionDueDate = null;
  }

  if (
    todayYmd &&
    doc.nextContributionDueDate &&
    doc.remainingContributionsOwed > 0
  ) {
    const dueYmd = dateToYmd(doc.nextContributionDueDate, timeZone);
    if (dueYmd && dueYmd < todayYmd) {
      doc.status = "overdue";
    }
  }

  if (
    doc.status !== "cancelled" &&
    doc.status !== "completed" &&
    doc.status !== "payout_received" &&
    doc.status !== "overdue"
  ) {
    doc.status = "active";
  }

  if (expectedPerCycle && doc.contributionPayments?.length) {
    doc.contributionsPaidCount = Math.floor(paid / expectedPerCycle);
  }

  return doc;
}
