import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { ymdRangeInclusive } from "../schedules/frequency.js";

const TZ = DEFAULT_SCHEDULE_TIMEZONE;

function pushEntry(byDay, entry) {
  if (!byDay[entry.ymd]) {
    byDay[entry.ymd] = [];
  }
  byDay[entry.ymd].push(entry);
}

function financialEntry({ href, title, kind, ymd, status }) {
  return {
    title,
    kind,
    ymd,
    time: null,
    status,
    href,
    marker: "financial",
  };
}

export function buildInstallmentCalendarEntries(doc) {
  const entries = [];
  if (doc.status === "cancelled" || doc.status === "completed") {
    return entries;
  }
  if (doc.nextDueDate) {
    const ymd = dateToYmd(doc.nextDueDate, TZ);
    if (ymd) {
      entries.push(
        financialEntry({
          href: `/planning/installments/${doc._id}`,
          title: `${doc.name} · Installment due`,
          kind: "installmentDue",
          ymd,
          status: doc.status,
        }),
      );
    }
  }
  return entries;
}

export function buildKametiCalendarEntries(doc) {
  const entries = [];
  if (doc.status === "cancelled") {
    return entries;
  }
  if (doc.nextContributionDueDate && doc.remainingContributionsOwed > 0) {
    const ymd = dateToYmd(doc.nextContributionDueDate, TZ);
    if (ymd) {
      entries.push(
        financialEntry({
          href: `/planning/kameti/${doc._id}`,
          title: `${doc.planName} · Contribution due`,
          kind: "kametiContributionDue",
          ymd,
          status: doc.status,
        }),
      );
    }
  }
  if (doc.expectedPayoutDate && !doc.payoutReceivedAt) {
    const ymd = dateToYmd(doc.expectedPayoutDate, TZ);
    if (ymd) {
      entries.push(
        financialEntry({
          href: `/planning/kameti/${doc._id}`,
          title: `${doc.planName} · Expected payout`,
          kind: "kametiPayoutExpected",
          ymd,
          status: doc.status,
        }),
      );
    }
  }
  return entries;
}

export function buildSubscriptionCalendarEntries(doc) {
  if (doc.status !== "active" && doc.status !== "paused") {
    return [];
  }
  if (!doc.nextBillingDate) {
    return [];
  }
  const ymd = dateToYmd(doc.nextBillingDate, TZ);
  if (!ymd) {
    return [];
  }
  return [
    financialEntry({
      href: `/planning/subscriptions/${doc._id}`,
      title: `${doc.serviceName} · Billing`,
      kind: "subscriptionBilling",
      ymd,
      status: doc.status,
    }),
  ];
}

export function buildApplicationCalendarEntries(doc) {
  if (!doc.applicationDeadline) {
    return [];
  }
  const ymd = dateToYmd(doc.applicationDeadline, TZ);
  if (!ymd) {
    return [];
  }
  return [
    financialEntry({
      href: `/planning/applications/${doc._id}`,
      title: `${doc.universityName} · Application deadline`,
      kind: "applicationDeadline",
      ymd,
      status: doc.applicationStatus,
    }),
  ];
}

export function buildTourCalendarEntries(doc) {
  const entries = [];
  const startYmd = dateToYmd(doc.startDate, TZ);
  const endYmd = dateToYmd(doc.endDate, TZ);
  if (!startYmd || !endYmd) {
    return entries;
  }
  const days = ymdRangeInclusive(startYmd, endYmd);
  for (const ymd of days) {
    const label =
      ymd === startYmd
        ? `${doc.name} · Tour starts`
        : ymd === endYmd
          ? `${doc.name} · Tour ends`
          : `${doc.name} · Tour day`;
    entries.push(
      financialEntry({
        href: `/planning/tours/${doc._id}`,
        title: label,
        kind: ymd === startYmd ? "tourStart" : ymd === endYmd ? "tourEnd" : "tourDay",
        ymd,
        status: doc.bookingStatus,
      }),
    );
  }
  return entries;
}

export function indexPlanningEntriesByYmd(items, builder) {
  const byDay = {};
  for (const item of items) {
    for (const entry of builder(item)) {
      pushEntry(byDay, entry);
    }
  }
  return byDay;
}

export function mergeAllPlanningCalendarMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    for (const [ymd, entries] of Object.entries(map || {})) {
      if (!merged[ymd]) {
        merged[ymd] = [];
      }
      merged[ymd].push(...entries);
    }
  }
  for (const ymd of Object.keys(merged)) {
    merged[ymd].sort((a, b) => a.title.localeCompare(b.title));
  }
  return merged;
}
