import { formatCurrency, formatDate } from "@/lib/format";
import { installmentTotalPaid } from "@/lib/planning/installment-display.js";
import { formatInsuranceAnnualDueLabel } from "@/lib/planning/insurance";
import { DEFAULT_PLANNING_CURRENCY } from "@/lib/planning/constants";

function localYmdFromDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isYmdInMonth(ymd, year, month) {
  if (!ymd || ymd.length < 7) {
    return false;
  }
  const [y, m] = ymd.split("-").map(Number);
  return y === year && m === month;
}

function addToCurrencyBuckets(buckets, currency, amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return;
  }
  const code = currency || DEFAULT_PLANNING_CURRENCY;
  buckets[code] = (buckets[code] || 0) + numeric;
}

function formatCurrencyBuckets(buckets) {
  const entries = Object.entries(buckets).filter(([, total]) => total > 0);
  if (!entries.length) {
    return null;
  }
  return entries
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(" · ");
}

function sumPaymentsInMonth(payments, currency, year, month, buckets) {
  for (const payment of payments || []) {
    const ymd = localYmdFromDate(payment.paidAt);
    if (isYmdInMonth(ymd, year, month)) {
      addToCurrencyBuckets(buckets, currency, payment.amount);
    }
  }
}

export function monthlyPaidLabelForSection(sectionKey, items, year, month) {
  if (!year || !month || !items?.length) {
    return null;
  }
  const buckets = {};
  for (const item of items) {
    switch (sectionKey) {
      case "installments":
        sumPaymentsInMonth(item.payments, item.currency, year, month, buckets);
        break;
      case "kameti":
        sumPaymentsInMonth(
          item.contributionPayments,
          item.currency,
          year,
          month,
          buckets,
        );
        if (item.payoutReceivedAt && item.payoutAmount) {
          const ymd = localYmdFromDate(item.payoutReceivedAt);
          if (isYmdInMonth(ymd, year, month)) {
            addToCurrencyBuckets(buckets, item.currency, item.payoutAmount);
          }
        }
        break;
      case "subscriptions":
        sumPaymentsInMonth(item.paymentHistory, item.currency, year, month, buckets);
        break;
      case "insurance":
        sumPaymentsInMonth(item.payments, item.currency, year, month, buckets);
        break;
      case "applications":
        if (item.feePaymentStatus === "paid" && item.applicationFee) {
          const ymd = localYmdFromDate(item.submissionDate);
          if (isYmdInMonth(ymd, year, month)) {
            addToCurrencyBuckets(
              buckets,
              item.feeCurrency || item.currency,
              item.applicationFee,
            );
          }
        }
        break;
      case "tours":
        for (const expense of item.expenses || []) {
          const ymd = localYmdFromDate(expense.date);
          if (isYmdInMonth(ymd, year, month)) {
            addToCurrencyBuckets(buckets, item.currency, expense.amount);
          }
        }
        break;
      default:
        break;
    }
  }
  return formatCurrencyBuckets(buckets);
}

export const PLANNING_HUB_SECTIONS = [
  {
    key: "installments",
    title: "Installments & dues",
    description:
      "Commitments with recurring installment schedules and payment history.",
    href: "/planning/installments",
    newHref: "/planning/installments/new",
    newLabel: "New commitment",
  },
  {
    key: "kameti",
    title: "Kameti",
    description: "Track contributions, payouts, and remaining obligations separately.",
    href: "/planning/kameti",
    newHref: "/planning/kameti/new",
    newLabel: "New plan",
  },
  {
    key: "subscriptions",
    title: "Subscriptions",
    description: "Billing cycles, renewals, and recorded payments.",
    href: "/planning/subscriptions",
    newHref: "/planning/subscriptions/new",
    newLabel: "New subscription",
  },
  {
    key: "insurance",
    title: "Insurance",
    description: "Policy numbers, premium schedules, term years, and due dates.",
    href: "/planning/insurance",
    newHref: "/planning/insurance/new",
    newLabel: "New policy",
  },
  {
    key: "applications",
    title: "University applications",
    description: "Deadlines, fees, and application status.",
    href: "/planning/applications",
    newHref: "/planning/applications/new",
    newLabel: "New application",
  },
  {
    key: "tours",
    title: "Tours & trips",
    description: "Multi-day plans, budgets, and expense records.",
    href: "/planning/tours",
    newHref: "/planning/tours/new",
    newLabel: "New tour",
  },
];

export function mapInstallmentHubRow(item) {
  const summary = item.openEnded
    ? `${item.status} · Open-ended · Paid ${formatCurrency(installmentTotalPaid(item), item.currency)}`
    : `${item.status} · Outstanding ${formatCurrency(item.outstandingBalance, item.currency)} · Next ${formatDate(item.nextDueDate)}`;
  return {
    id: item._id,
    category: "Installments & dues",
    title: item.name,
    summary,
    href: `/planning/installments/${item._id}`,
  };
}

export function mapKametiHubRow(item) {
  const paid = item.contributionsPaidCount ?? item.contributionPayments?.length ?? 0;
  return {
    id: item._id,
    category: "Kameti",
    title: item.planName,
    summary: `${String(item.status).replace(/_/g, " ")} · ${paid}/${item.totalParticipants} rounds · Remaining ${formatCurrency(item.remainingContributionsOwed, item.currency)}`,
    href: `/planning/kameti/${item._id}`,
  };
}

export function mapSubscriptionHubRow(item) {
  return {
    id: item._id,
    category: "Subscriptions",
    title: item.serviceName,
    summary: `${formatCurrency(item.amount, item.currency)} · Next ${formatDate(item.nextBillingDate)} · ${item.status}`,
    href: `/planning/subscriptions/${item._id}`,
  };
}

export function mapInsuranceHubRow(item) {
  const due = formatInsuranceAnnualDueLabel(item.premiumDueMonth, item.premiumDueDay);
  return {
    id: item._id,
    category: "Insurance",
    title: item.insurerName || item.policyNumber,
    summary: `${item.policyNumber} · ${item.status}${due ? ` · Due ${due}` : ""}`,
    href: `/planning/insurance/${item._id}`,
  };
}

export function mapApplicationHubRow(item) {
  return {
    id: item._id,
    category: "University applications",
    title: `${item.universityName} — ${item.programName}`,
    summary: `Deadline ${formatDate(item.applicationDeadline)} · ${item.applicationStatus}`,
    href: `/planning/applications/${item._id}`,
  };
}

export function mapTourHubRow(item) {
  return {
    id: item._id,
    category: "Tours & trips",
    title: item.name,
    summary: `${formatDate(item.startDate)} – ${formatDate(item.endDate)} · ${item.durationDays} days`,
    href: `/planning/tours/${item._id}`,
  };
}

export const PLANNING_HUB_ROW_MAPPERS = {
  installments: mapInstallmentHubRow,
  kameti: mapKametiHubRow,
  subscriptions: mapSubscriptionHubRow,
  insurance: mapInsuranceHubRow,
  applications: mapApplicationHubRow,
  tours: mapTourHubRow,
};

export function rowsForSection(key, items) {
  const mapRow = PLANNING_HUB_ROW_MAPPERS[key];
  if (!mapRow || !items?.length) {
    return [];
  }
  return items.map(mapRow);
}

export function mergedHubRows(itemsByKey) {
  const rows = [];
  for (const section of PLANNING_HUB_SECTIONS) {
    rows.push(...rowsForSection(section.key, itemsByKey[section.key]));
  }
  return rows.sort(
    (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
  );
}
