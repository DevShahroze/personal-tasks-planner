import { formatCurrency, formatDate, formatDateTime } from "../../format.js";
import { richTextToPlainText } from "../../rich-text/plain-text.js";
import { formatInsuranceAnnualDueLabel } from "../insurance.js";
import {
  installmentIsOpenEnded,
  installmentTotalPaid,
} from "../installment-display.js";
import {
  kametiContributionPaymentDescription,
  kametiExpectedPayoutAmount,
  kametiPerPersonContribution,
  kametiPoolPerRound,
  kametiRoundsPaid,
  kametiRoundsRemaining,
  kametiYourPayoutMonthLabel,
} from "../kameti.js";

function field(label, value) {
  return { label, value: value == null || value === "" ? "—" : String(value) };
}

function paymentRowsFromHistory(rows, currency) {
  return (rows || []).map((payment, index) => ({
    index: index + 1,
    paidAt: payment.paidAt,
    paidAtLabel: payment.paidAt ? formatDateTime(payment.paidAt) : "—",
    amount: Number(payment.amount) || 0,
    amountLabel: formatCurrency(payment.amount, currency),
    note: payment.note || payment.kind || "",
  }));
}

export function buildInstallmentExportSnapshot(item) {
  const currency = item.currency || "PKR";
  const openEnded = installmentIsOpenEnded(item);
  const totalPaid = installmentTotalPaid(item);

  const summary = [
    field("Name", item.name),
    field("Status", item.status),
    field("Currency", currency),
    field("Description", richTextToPlainText(item.description)),
    field("Start date", formatDate(item.startDate)),
    field("Next due", formatDate(item.nextDueDate)),
    field("Billing frequency", item.billingFrequency),
    field(
      "Installments paid",
      item.totalInstallments
        ? `${item.installmentsPaid ?? 0} of ${item.totalInstallments}`
        : String(item.installmentsPaid ?? 0),
    ),
    field(
      "Typical installment",
      item.installmentAmount
        ? formatCurrency(item.installmentAmount, currency)
        : "Variable",
    ),
    field(
      "Down payment",
      item.downPaymentAmount
        ? `${formatCurrency(item.downPaymentAmount, currency)}${
            item.downPaymentDate ? ` on ${formatDate(item.downPaymentDate)}` : ""
          }`
        : null,
    ),
    field("Total paid", formatCurrency(totalPaid, currency)),
    openEnded
      ? field("Commitment type", "Open-ended")
      : field("Total commitment", formatCurrency(item.totalAmount, currency)),
    openEnded
      ? null
      : field("Outstanding", formatCurrency(item.outstandingBalance, currency)),
    field("Last updated", formatDateTime(item.updatedAt)),
  ].filter(Boolean);

  const payments = (item.payments || []).map((payment, index) => ({
    index: index + 1,
    paidAt: payment.paidAt,
    paidAtLabel: payment.paidAt ? formatDateTime(payment.paidAt) : "—",
    amount: Number(payment.amount) || 0,
    amountLabel: formatCurrency(payment.amount, currency),
    note: [payment.kind, payment.note].filter(Boolean).join(" · "),
  }));

  return {
    kind: "installment",
    title: item.name || "Installment",
    fileBase: "installment",
    summary,
    payments,
    currency,
    paymentColumns: ["#", "Paid at", "Amount", "Note"],
  };
}

export function buildSubscriptionExportSnapshot(item) {
  const currency = item.currency || "PKR";
  const freq =
    item.billingFrequency === "custom" && item.customIntervalDays
      ? `Every ${item.customIntervalDays} days`
      : item.billingFrequency || "—";

  const summary = [
    field("Service", item.serviceName),
    field("Status", item.status),
    field("Currency", currency),
    field("Amount", formatCurrency(item.amount, currency)),
    field("Manual billing", item.manualBilling ? "Yes" : "No"),
    field("Billing frequency", item.manualBilling ? "Manual" : freq),
    field("Next billing", formatDate(item.nextBillingDate)),
    field("Notes", richTextToPlainText(item.notes)),
    field("Last updated", formatDateTime(item.updatedAt)),
  ];

  const payments = paymentRowsFromHistory(item.paymentHistory, currency);

  return {
    kind: "subscription",
    title: item.serviceName || "Subscription",
    fileBase: "subscription",
    summary,
    payments,
    currency,
    paymentColumns: ["#", "Paid at", "Amount", "Note"],
  };
}

export function buildInsuranceExportSnapshot(item) {
  const currency = item.currency || "PKR";
  const dueLabel = formatInsuranceAnnualDueLabel(
    item.premiumDueMonth,
    item.premiumDueDay,
  );

  const paymentYears =
    item.premiumPaymentYears ?? item.termYears ?? item.totalPremiumPayments;

  const summary = [
    field("Insurance company", item.insurerName),
    field("Policy number", item.policyNumber),
    field("Name", item.appLoginName),
    field(
      "Sum assured",
      item.sumAssured != null ? formatCurrency(item.sumAssured, currency) : null,
    ),
    field("Due date", dueLabel || "—"),
    field("Years you will pay", paymentYears),
    field("Matures in (years)", item.maturityYears),
    field("Maturity date", formatDate(item.maturityDate)),
    field("Status", item.status),
    field("Next premium due", formatDate(item.nextDueDate)),
    field("Premiums paid (years)", item.premiumsPaid),
    field("Outstanding", formatCurrency(item.outstandingBalance, currency)),
    field("Notes", richTextToPlainText(item.description)),
    field("Last updated", formatDateTime(item.updatedAt)),
  ];

  if (item.annualSubmissions?.length) {
    for (const row of item.annualSubmissions) {
      summary.push(
        field(`Amount submitted (${row.year})`, formatCurrency(row.amount, currency)),
      );
    }
  }

  const payments = paymentRowsFromHistory(item.payments, currency);

  return {
    kind: "insurance",
    title: item.insurerName || item.policyNumber || "Insurance",
    fileBase: "insurance",
    summary,
    payments,
    currency,
    paymentColumns: ["#", "Paid at", "Amount", "Note"],
  };
}

export function buildKametiExportSnapshot(item) {
  const currency = item.currency || "PKR";
  const perPerson = kametiPerPersonContribution(item);
  const pool = kametiPoolPerRound(item);
  const roundsPaid = kametiRoundsPaid(item);
  const roundsLeft = kametiRoundsRemaining(item);
  const payoutMonth = kametiYourPayoutMonthLabel(item);
  const expectedPayout = kametiExpectedPayoutAmount(item);

  const summary = [
    field("Plan name", item.planName),
    field("Status", (item.status || "").replace(/_/g, " ")),
    field("Currency", currency),
    field("Participants", item.totalParticipants),
    field("Rounds paid", `${roundsPaid} of ${item.totalParticipants}`),
    field("Rounds remaining", String(roundsLeft)),
    field(
      "Per-person share",
      perPerson != null ? formatCurrency(perPerson, currency) : null,
    ),
    field("Pool per round", pool != null ? formatCurrency(pool, currency) : null),
    field("Start date", formatDate(item.startDate)),
    field("End date", formatDate(item.endDate)),
    field("Expected payout date", formatDate(item.expectedPayoutDate)),
    field("Your payout month", payoutMonth),
    field(
      "Expected payout amount",
      expectedPayout != null ? formatCurrency(expectedPayout, currency) : null,
    ),
    field(
      "Payout received",
      item.payoutReceivedAt
        ? `${formatDate(item.payoutReceivedAt)} · ${formatCurrency(item.payoutAmount, currency)}`
        : null,
    ),
    field("Next contribution due", formatDate(item.nextContributionDueDate)),
    field("Remaining owed", formatCurrency(item.remainingContributionsOwed, currency)),
    field("Notes", richTextToPlainText(item.notes)),
    field("Last updated", formatDateTime(item.updatedAt)),
  ];

  const payments = (item.contributionPayments || []).map((payment, index) => ({
    index: index + 1,
    paidAt: payment.paidAt,
    paidAtLabel: payment.paidAt ? formatDateTime(payment.paidAt) : "—",
    amount: Number(payment.amount) || 0,
    amountLabel: formatCurrency(payment.amount, currency),
    note: kametiContributionPaymentDescription(item, index),
  }));

  return {
    kind: "kameti",
    title: item.planName || "Kameti",
    fileBase: "kameti",
    summary,
    payments,
    currency,
    paymentColumns: ["#", "Paid at", "Amount", "Round / note"],
  };
}
