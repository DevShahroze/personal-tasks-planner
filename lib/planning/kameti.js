import { roundMoney } from "../finance/balance.js";
import { addIntervalToYmd, dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { advanceYmdByFrequency } from "../schedules/frequency.js";
import {
  planningDueCalendarYmd,
  ymdMonthLabel,
} from "../calendar/planning-calendar-display.js";

export function kametiYourPayoutMonthLabel(doc) {
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const payoutYmd = dateToYmd(doc?.expectedPayoutDate, timeZone);
  return ymdMonthLabel(payoutYmd);
}

export function kametiContributionPaymentDescription(doc, paymentIndex) {
  const total = doc?.totalParticipants ?? 0;
  if (!total) {
    return "Contribution paid";
  }
  const roundYmd = kametiContributionRoundYmd(doc, paymentIndex);
  const month = ymdMonthLabel(roundYmd);
  const roundPart = `Contribution paid (${paymentIndex + 1}/${total})`;
  const payoutRoundIndex = kametiPayoutRoundIndex(doc);
  if (payoutRoundIndex != null && paymentIndex === payoutRoundIndex) {
    const payoutMonth = kametiYourPayoutMonthLabel(doc) || month;
    return payoutMonth
      ? `${payoutMonth} · ${roundPart} · Your Kameti payout month — you receive the pool this round`
      : `${roundPart} · Your Kameti payout month — you receive the pool this round`;
  }
  return month ? `${month} · ${roundPart}` : roundPart;
}

export function kametiPerPersonContribution(doc) {
  if (!doc?.contributionAmount) {
    return null;
  }
  return roundMoney(doc.contributionAmount);
}

export function kametiPoolPerRound(doc) {
  if (doc?.poolAmountPerRound != null && doc.poolAmountPerRound > 0) {
    return roundMoney(doc.poolAmountPerRound);
  }
  const per = kametiPerPersonContribution(doc);
  const n = doc?.totalParticipants;
  if (!per || !n) {
    return null;
  }
  return roundMoney(per * n);
}

/** Total each member pays over all rounds in the plan. */
export function expectedKametiContributions(doc) {
  const per = kametiPerPersonContribution(doc);
  const n = doc?.totalParticipants;
  if (!per || !n) {
    return null;
  }
  return roundMoney(n * per);
}

export function kametiRoundsPaid(doc) {
  return doc?.contributionPayments?.length ?? 0;
}

export function kametiRoundsRemaining(doc) {
  const n = doc?.totalParticipants ?? 0;
  return Math.max(0, n - kametiRoundsPaid(doc));
}

/** Amount others pay you when it is your payout month (pool minus your share). */
export function kametiExpectedPayoutAmount(doc) {
  const per = kametiPerPersonContribution(doc);
  const n = doc?.totalParticipants;
  if (!per || !n) {
    return null;
  }
  if (n <= 1) {
    return roundMoney(0);
  }
  return roundMoney((n - 1) * per);
}

/** One participant ≈ one monthly period; last due = start + (n − 1) months. */
export function defaultKametiEndYmdFromParticipants(startYmd, totalParticipants) {
  const n = Number(totalParticipants);
  if (!startYmd || !/^\d{4}-\d{2}-\d{2}$/.test(String(startYmd))) {
    return "";
  }
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    return "";
  }
  if (n === 1) {
    return startYmd;
  }
  return addIntervalToYmd(startYmd, n - 1, "months") || "";
}

export function kametiContributionRoundYmd(doc, roundIndex) {
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  let ymd = dateToYmd(doc.startDate, timeZone);
  if (!ymd || roundIndex < 0) {
    return null;
  }
  for (let i = 0; i < roundIndex; i += 1) {
    const next = advanceYmdByFrequency(
      ymd,
      doc.contributionFrequency,
      doc.customIntervalDays,
    );
    if (!next) {
      return null;
    }
    ymd = next;
  }
  return ymd;
}

/** Which contribution round (0-based) matches the expected payout month. */
export function kametiPayoutRoundIndex(doc) {
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const payoutYmd = dateToYmd(doc.expectedPayoutDate, timeZone);
  if (!payoutYmd) {
    return null;
  }
  const payoutYm = payoutYmd.slice(0, 7);
  const n = doc.totalParticipants ?? 0;
  for (let i = 0; i < n; i += 1) {
    const roundYmd = kametiContributionRoundYmd(doc, i);
    if (roundYmd && roundYmd.slice(0, 7) === payoutYm) {
      return i;
    }
  }
  return null;
}

/** Paid at least one scheduled round after your payout month → payout is treated as received. */
export function kametiPayoutInferredFromContributions(doc) {
  if (!doc.expectedPayoutDate || doc.payoutReceivedAt) {
    return false;
  }
  const payoutRoundIndex = kametiPayoutRoundIndex(doc);
  if (payoutRoundIndex == null) {
    return false;
  }
  return kametiRoundsPaid(doc) > payoutRoundIndex + 1;
}

export function kametiPayoutLooksAutoInferred(doc) {
  if (!doc.payoutReceivedAt || !doc.expectedPayoutDate) {
    return false;
  }
  const payoutRoundIndex = kametiPayoutRoundIndex(doc);
  if (payoutRoundIndex == null) {
    return false;
  }
  return kametiRoundsPaid(doc) > payoutRoundIndex + 1;
}

export function nextUnpaidKametiContributionYmd(doc) {
  const timeZone = DEFAULT_SCHEDULE_TIMEZONE;
  const startYmd = dateToYmd(doc.startDate, timeZone);
  if (!startYmd) {
    return null;
  }
  const paid = kametiRoundsPaid(doc);
  if (paid >= doc.totalParticipants) {
    return null;
  }
  let ymd = startYmd;
  for (let i = 0; i < paid; i += 1) {
    const advanced = advanceYmdByFrequency(
      ymd,
      doc.contributionFrequency,
      doc.customIntervalDays,
    );
    if (!advanced) {
      return null;
    }
    ymd = advanced;
  }
  return ymd;
}

export function kametiCalendarContributionDisplayYmd(doc, options = {}) {
  if (
    doc.status === "cancelled" ||
    doc.status === "paused" ||
    (doc.remainingContributionsOwed ?? 0) <= 0
  ) {
    return null;
  }
  const dueYmd = nextUnpaidKametiContributionYmd(doc);
  if (!dueYmd) {
    return null;
  }
  return planningDueCalendarYmd(dueYmd, options.todayYmd);
}

export function kametiUnpaidRoundMonthLabel(doc, timeZone = DEFAULT_SCHEDULE_TIMEZONE) {
  const dueYmd = nextUnpaidKametiContributionYmd(doc);
  if (!dueYmd) {
    return null;
  }
  void timeZone;
  return ymdMonthLabel(dueYmd);
}

export function syncKametiPlan(doc, todayYmd) {
  const perPerson = kametiPerPersonContribution(doc);
  const roundsRemaining = kametiRoundsRemaining(doc);

  doc.contributionsPaidCount = kametiRoundsPaid(doc);

  if (perPerson != null && doc.totalParticipants) {
    doc.remainingContributionsOwed = roundMoney(roundsRemaining * perPerson);
  } else {
    doc.remainingContributionsOwed = roundMoney(
      Math.max(0, doc.remainingContributionsOwed ?? 0),
    );
  }

  if (doc.status === "cancelled") {
    return doc;
  }

  if (doc.status === "paused") {
    return doc;
  }

  if (kametiPayoutInferredFromContributions(doc)) {
    const expected = kametiExpectedPayoutAmount(doc);
    if (expected != null) {
      doc.payoutAmount = expected;
    }
    doc.payoutReceivedAt = doc.expectedPayoutDate;
  }

  if (doc.payoutReceivedAt && doc.payoutAmount) {
    if (doc.remainingContributionsOwed <= 0) {
      doc.status = "completed";
    } else if (doc.status !== "overdue") {
      doc.status = "payout_received";
    }
  }

  const nextYmd = nextUnpaidKametiContributionYmd(doc);
  if (nextYmd && doc.remainingContributionsOwed > 0) {
    doc.nextContributionDueDate = new Date(`${nextYmd}T12:00:00.000Z`);
  } else {
    doc.nextContributionDueDate = null;
  }

  if (doc.remainingContributionsOwed <= 0 && doc.status !== "cancelled") {
    if (doc.payoutReceivedAt && doc.payoutAmount) {
      doc.status = "completed";
    } else if (
      doc.status !== "payout_received" &&
      doc.status !== "overdue" &&
      doc.status !== "completed"
    ) {
      doc.status = "active";
    }
  } else if (
    doc.status !== "cancelled" &&
    doc.status !== "completed" &&
    doc.status !== "payout_received" &&
    doc.status !== "overdue"
  ) {
    doc.status = "active";
  }

  void todayYmd;
  return doc;
}
