import { dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { advanceYmdByFrequency, ymdRangeInclusive } from "../schedules/frequency.js";
import {
  planningBillingDueCalendarYmd,
  planningDueCalendarYmd,
  ymdMonthLabel,
} from "./planning-calendar-display.js";
import { kametiContributionRoundYmd, kametiRoundsPaid } from "../planning/kameti.js";

function entryInViewedMonth(ymd, options) {
  const { monthFirstYmd, monthLastYmd } = options || {};
  if (!monthFirstYmd || !monthLastYmd) {
    return true;
  }
  return ymd >= monthFirstYmd && ymd <= monthLastYmd;
}

const TZ = DEFAULT_SCHEDULE_TIMEZONE;

function pushEntry(byDay, entry) {
  if (!byDay[entry.ymd]) {
    byDay[entry.ymd] = [];
  }
  byDay[entry.ymd].push(entry);
}

function financialEntry({ href, title, kind, ymd, status, detail }) {
  return {
    title,
    kind,
    ymd,
    time: null,
    status,
    detail: detail || null,
    href,
    marker: "financial",
  };
}

/** Scheduled due dates from start (closed-ended); one row per billing period. */
function installmentScheduledDueYmids(doc, timeZone) {
  const startYmd = doc.startDate ? dateToYmd(doc.startDate, timeZone) : null;
  if (!startYmd) {
    return [];
  }
  const endYmd = doc.endDate ? dateToYmd(doc.endDate, timeZone) : null;
  const { frequency, customIntervalDays } = doc;
  const dues = [];
  let d = startYmd;
  let guard = 0;
  while (d && guard < 500) {
    if (endYmd && d > endYmd) {
      break;
    }
    dues.push(d);
    const next = advanceYmdByFrequency(d, frequency, customIntervalDays);
    if (!next || next === d) {
      break;
    }
    d = next;
    guard += 1;
  }
  return dues;
}

export function buildInstallmentCalendarEntries(doc, options = {}) {
  const entries = [];
  if (
    doc.status === "cancelled" ||
    doc.status === "completed" ||
    doc.status === "paused"
  ) {
    return entries;
  }
  if ((doc.outstandingBalance ?? 0) <= 0 && !doc.openEnded) {
    return entries;
  }
  if (doc.openEnded && doc.status === "completed") {
    return entries;
  }
  const timeZone = options.timeZone || TZ;
  const todayYmd = options.todayYmd;
  if (!todayYmd) {
    const dueYmd = dateToYmd(doc.nextDueDate, timeZone);
    if (!dueYmd) {
      return entries;
    }
    const ymd = planningBillingDueCalendarYmd(dueYmd, todayYmd);
    if (!ymd || !entryInViewedMonth(ymd, options)) {
      return entries;
    }
    const monthLabel = ymdMonthLabel(dueYmd);
    entries.push(
      financialEntry({
        href: `/planning/installments/${doc._id}`,
        title: monthLabel
          ? `${doc.name} · ${monthLabel} installment`
          : `${doc.name} · Installment due`,
        kind: "installmentDue",
        ymd,
        status: doc.status === "overdue" ? "overdue" : null,
        detail: monthLabel ? `Pay ${monthLabel} installment` : null,
      }),
    );
    return entries;
  }

  /** Closed-ended (with schedule): show every unpaid period through today (missed + current). */
  if (!doc.openEnded && !doc.manualNextDueDate && doc.startDate) {
    const schedule = installmentScheduledDueYmids(doc, timeZone);
    const paidCount = Number(doc.installmentsPaid) || 0;
    for (let i = paidCount; i < schedule.length; i += 1) {
      const dueYmd = schedule[i];
      if (!dueYmd || dueYmd > todayYmd) {
        break;
      }
      const ymd = planningBillingDueCalendarYmd(dueYmd, todayYmd);
      if (!ymd || !entryInViewedMonth(ymd, options)) {
        continue;
      }
      const monthLabel = ymdMonthLabel(dueYmd);
      const overdue = dueYmd < todayYmd && doc.status !== "completed";
      entries.push(
        financialEntry({
          href: `/planning/installments/${doc._id}`,
          title: monthLabel
            ? `${doc.name} · ${monthLabel} installment`
            : `${doc.name} · Installment due`,
          kind: "installmentDue",
          ymd,
          status: overdue ? "overdue" : null,
          detail: monthLabel ? `Pay ${monthLabel} installment` : null,
        }),
      );
    }
    if (entries.length > 0) {
      return entries;
    }
  }

  const dueYmd = dateToYmd(doc.nextDueDate, timeZone);
  if (!dueYmd) {
    return entries;
  }
  const ymd = planningBillingDueCalendarYmd(dueYmd, todayYmd);
  if (!ymd || !entryInViewedMonth(ymd, options)) {
    return entries;
  }
  const monthLabel = ymdMonthLabel(dueYmd);
  entries.push(
    financialEntry({
      href: `/planning/installments/${doc._id}`,
      title: monthLabel
        ? `${doc.name} · ${monthLabel} installment`
        : `${doc.name} · Installment due`,
      kind: "installmentDue",
      ymd,
      status: doc.status === "overdue" ? "overdue" : null,
      detail: monthLabel ? `Pay ${monthLabel} installment` : null,
    }),
  );
  return entries;
}

export function buildKametiCalendarEntries(doc, options = {}) {
  const entries = [];
  if (doc.status === "cancelled" || doc.status === "paused") {
    return entries;
  }
  const timeZone = options.timeZone || TZ;
  const todayYmd = options.todayYmd;
  if ((doc.remainingContributionsOwed ?? 0) > 0 && todayYmd) {
    /** Closed-ended Kameti: stack each unpaid round through today (missed + current). */
    const paid = kametiRoundsPaid(doc);
    const n = doc.totalParticipants ?? 0;
    for (let i = paid; i < n; i += 1) {
      const dueYmd = kametiContributionRoundYmd(doc, i);
      if (!dueYmd || dueYmd > todayYmd) {
        break;
      }
      const ymd = planningDueCalendarYmd(dueYmd, todayYmd);
      if (!ymd || !entryInViewedMonth(ymd, options)) {
        continue;
      }
      const monthLabel = ymdMonthLabel(dueYmd);
      if (!monthLabel) {
        continue;
      }
      const overdue = dueYmd < todayYmd && doc.status !== "completed";
      entries.push(
        financialEntry({
          href: `/planning/kameti/${doc._id}`,
          title: `${doc.planName} · ${monthLabel} contribution`,
          kind: "kametiContributionDue",
          ymd,
          status: overdue ? "overdue" : null,
          detail: `Pay ${monthLabel} Kameti`,
        }),
      );
    }
  } else if ((doc.remainingContributionsOwed ?? 0) > 0 && !todayYmd) {
    const dueYmd = kametiContributionRoundYmd(doc, kametiRoundsPaid(doc));
    if (dueYmd) {
      const ymd = planningDueCalendarYmd(dueYmd, null);
      if (ymd && entryInViewedMonth(ymd, options)) {
        const monthLabel = ymdMonthLabel(dueYmd);
        if (monthLabel) {
          entries.push(
            financialEntry({
              href: `/planning/kameti/${doc._id}`,
              title: `${doc.planName} · ${monthLabel} contribution`,
              kind: "kametiContributionDue",
              ymd,
              status: doc.status === "overdue" ? "overdue" : null,
              detail: `Pay ${monthLabel} Kameti`,
            }),
          );
        }
      }
    }
  }
  if (doc.expectedPayoutDate && !doc.payoutReceivedAt) {
    const ymd = dateToYmd(doc.expectedPayoutDate, timeZone);
    if (ymd) {
      const { monthFirstYmd, monthLastYmd } = options;
      if (
        !monthFirstYmd ||
        !monthLastYmd ||
        (ymd >= monthFirstYmd && ymd <= monthLastYmd)
      ) {
        entries.push(
          financialEntry({
            href: `/planning/kameti/${doc._id}`,
            title: `${doc.planName} · Expected payout`,
            kind: "kametiPayoutExpected",
            ymd,
            status: null,
          }),
        );
      }
    }
  }
  return entries;
}

export function buildSubscriptionCalendarEntries(doc, options = {}) {
  if (doc.status !== "active") {
    return [];
  }
  const timeZone = options.timeZone || TZ;
  const dueYmd = dateToYmd(doc.nextBillingDate, timeZone);
  if (!dueYmd) {
    return [];
  }
  const ymd = planningBillingDueCalendarYmd(dueYmd, options.todayYmd);
  if (!ymd || !entryInViewedMonth(ymd, options)) {
    return [];
  }
  const monthLabel = ymdMonthLabel(dueYmd);
  const pinned =
    options.todayYmd && ymd === options.todayYmd && dueYmd !== options.todayYmd;
  return [
    financialEntry({
      href: `/planning/subscriptions/${doc._id}`,
      title: monthLabel
        ? `${doc.serviceName} · ${monthLabel} billing`
        : `${doc.serviceName} · Billing`,
      kind: "subscriptionBilling",
      ymd,
      status: pinned ? "overdue" : null,
      detail: monthLabel ? `Pay ${monthLabel} subscription` : null,
    }),
  ];
}

export function buildInsuranceCalendarEntries(doc) {
  const entries = [];
  if (doc.status === "cancelled" || doc.status === "completed") {
    return entries;
  }
  if (doc.nextDueDate) {
    const ymd = dateToYmd(doc.nextDueDate, TZ);
    if (ymd) {
      entries.push(
        financialEntry({
          href: `/planning/insurance/${doc._id}`,
          title: `${doc.insurerName} · Premium due`,
          kind: "insurancePremiumDue",
          ymd,
          status: doc.status,
        }),
      );
    }
  }
  return entries;
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

export function indexPlanningEntriesByYmd(items, builder, options) {
  const byDay = {};
  for (const item of items) {
    const built = options ? builder(item, options) : builder(item);
    for (const entry of built) {
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
