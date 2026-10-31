import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceYmdByFrequency,
  inclusiveDurationDays,
} from "../../lib/schedules/frequency.js";
import { syncInstallmentCommitment } from "../../lib/planning/installments.js";
import {
  syncKametiPlan,
  defaultKametiEndYmdFromParticipants,
  kametiCalendarContributionDisplayYmd,
} from "../../lib/planning/kameti.js";
import {
  isDuplicatePayment,
  sortPaymentsByPaidAtAsc,
} from "../../lib/payments/mongoose.js";
import {
  buildPrepaidPaymentRecords,
  parsePrepaidPaymentAmounts,
} from "../../lib/planning/prepaid-payments.js";
import {
  validateInstallmentCreate,
  validateInstallmentUpdate,
  validateInstallmentPaymentLog,
} from "../../lib/planning/validate.js";
import {
  buildTourCalendarEntries,
  buildInstallmentCalendarEntries,
  buildSubscriptionCalendarEntries,
} from "../../lib/calendar/planning-entries.js";
import { planningDueCalendarYmd } from "../../lib/calendar/planning-calendar-display.js";

test("validateInstallmentCreate records down payment separately from installments", () => {
  const result = validateInstallmentCreate({
    name: "Car",
    totalAmount: 100000,
    installmentAmount: 5000,
    frequency: "monthly",
    startDate: "2026-01-01",
    downPaymentAmount: 20000,
    downPaymentDate: "2025-12-15",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.downPaymentAmount, 20000);
  assert.equal(result.value.payments.length, 1);
  assert.equal(result.value.payments[0].amount, 20000);
  assert.equal(result.value.payments[0].note, "Down payment");
  assert.equal(
    result.value.payments[0].paidAt.toISOString().slice(0, 10),
    "2025-12-15",
  );
});

test("validateInstallmentPaymentLog sets note from payment type", () => {
  const balloon = validateInstallmentPaymentLog({
    amount: 1000,
    paymentKind: "balloon",
  });
  assert.equal(balloon.ok, true);
  assert.equal(balloon.value.note, "Balloon payment");
});

test("validateInstallmentUpdate accepts commitment field changes", () => {
  const result = validateInstallmentUpdate({
    name: "Updated loan",
    totalAmount: 5000,
    installmentAmount: 500,
    frequency: "monthly",
    startDate: "2026-02-01",
    endDate: null,
    totalInstallments: 10,
    status: "active",
  });
  assert.equal(result.ok, true);
  assert.equal(result.patch.name, "Updated loan");
  assert.equal(result.patch.manualNextDueDate, false);
});

test("validateInstallmentUpdate accepts manual next due date", () => {
  const result = validateInstallmentUpdate({ nextDueDate: "2026-08-15" });
  assert.equal(result.ok, true);
  assert.equal(result.patch.manualNextDueDate, true);
});

test("planningDueCalendarYmd pins overdue planning dates to today", () => {
  assert.equal(planningDueCalendarYmd("2026-09-01", "2026-11-15"), "2026-11-15");
  assert.equal(planningDueCalendarYmd("2026-12-01", "2026-11-15"), "2026-12-01");
});

test("installment calendar entry pins unpaid due date to today in viewed month", () => {
  const entries = buildInstallmentCalendarEntries(
    {
      _id: "507f1f77bcf86cd799439011",
      name: "Car loan",
      nextDueDate: new Date("2026-10-01T12:00:00.000Z"),
      outstandingBalance: 1000,
      status: "overdue",
    },
    {
      todayYmd: "2026-11-15",
      monthFirstYmd: "2026-11-01",
      monthLastYmd: "2026-11-30",
    },
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].ymd, "2026-11-15");
  assert.match(entries[0].title, /October 2026/);
});

test("subscription calendar shows future billing on scheduled day", () => {
  const entries = buildSubscriptionCalendarEntries(
    {
      _id: "507f1f77bcf86cd799439011",
      serviceName: "Streaming",
      nextBillingDate: new Date("2026-11-20T12:00:00.000Z"),
      status: "active",
    },
    {
      todayYmd: "2026-11-15",
      monthFirstYmd: "2026-11-01",
      monthLastYmd: "2026-11-30",
    },
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].ymd, "2026-11-20");
});

test("buildPrepaidPaymentRecords creates monthly history from start date", () => {
  const payments = buildPrepaidPaymentRecords({
    count: 3,
    amountPerPayment: 100,
    startDate: new Date("2026-01-15T12:00:00.000Z"),
    frequency: "monthly",
  });
  assert.equal(payments.length, 3);
  assert.equal(payments[0].amount, 100);
  assert.equal(payments[0].paidAt.toISOString().slice(0, 10), "2026-01-15");
  assert.equal(payments[2].paidAt.toISOString().slice(0, 10), "2026-03-15");
});

test("kameti prepaid contribution notes use total participants as denominator", () => {
  const payments = buildPrepaidPaymentRecords({
    count: 5,
    amountPerPayment: 100_000,
    startDate: new Date("2026-05-01T12:00:00.000Z"),
    frequency: "monthly",
    notePrefix: "Contribution paid",
    noteDenominator: 12,
  });
  assert.equal(payments.length, 5);
  assert.equal(payments[0].note, "Contribution paid (1/12)");
  assert.equal(payments[4].note, "Contribution paid (5/12)");
});

test("validateInstallmentCreate records lump sum already paid as one payment", () => {
  const result = validateInstallmentCreate({
    name: "Plots",
    totalAmount: 500000,
    startDate: "2026-01-01",
    frequency: "monthly",
    prepaidLumpSum: 150000,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.payments.length, 1);
  assert.equal(result.value.payments[0].amount, 150000);
  assert.match(result.value.payments[0].note, /lump sum/i);
});

test("validateInstallmentCreate applies prepaid payments", () => {
  const result = validateInstallmentCreate({
    name: "Loan",
    totalAmount: 1000,
    installmentAmount: 100,
    frequency: "monthly",
    startDate: "2026-01-01",
    prepaidPaymentsCount: 2,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.payments.length, 2);
  assert.equal(result.value.payments[0].amount, 100);
});

test("validateInstallmentCreate supports variable prepaid amounts", () => {
  const result = validateInstallmentCreate({
    name: "Loan",
    totalAmount: 1000,
    frequency: "monthly",
    startDate: "2026-01-01",
    prepaidPaymentAmounts: "100\n120\n90",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.payments.length, 3);
  assert.equal(result.value.payments[1].amount, 120);
  assert.equal(result.value.installmentAmount, null);
});

test("parsePrepaidPaymentAmounts accepts comma-separated values", () => {
  const errors = [];
  const amounts = parsePrepaidPaymentAmounts("50, 75, 80", errors);
  assert.equal(errors.length, 0);
  assert.deepEqual(amounts, [50, 75, 80]);
});

test("parsePrepaidPaymentAmounts accepts thousand separators on one line", () => {
  const errors = [];
  const amounts = parsePrepaidPaymentAmounts("52,800", errors);
  assert.equal(errors.length, 0);
  assert.deepEqual(amounts, [52800]);
});

test("advanceYmdByFrequency moves monthly dates", () => {
  assert.equal(advanceYmdByFrequency("2026-01-15", "monthly"), "2026-02-15");
});

test("inclusiveDurationDays counts both endpoints", () => {
  assert.equal(inclusiveDurationDays("2026-06-01", "2026-06-03"), 3);
});

test("validateInstallmentCreate allows open-ended without start date", () => {
  const result = validateInstallmentCreate({
    name: "Plots and construction",
    openEnded: true,
    frequency: "monthly",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.startDate, null);
});

test("validateInstallmentCreate allows open-ended contributions without total", () => {
  const result = validateInstallmentCreate({
    name: "Plots and construction",
    openEnded: true,
    startDate: "2026-01-01",
    frequency: "monthly",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.openEnded, true);
  assert.equal(result.value.totalAmount, null);
  assert.equal(result.value.outstandingBalance, 0);
});

test("syncInstallmentCommitment keeps open-ended active with payments", () => {
  const doc = {
    openEnded: true,
    totalAmount: null,
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    frequency: "monthly",
    payments: [
      { amount: 50000, paidAt: new Date("2026-01-15T12:00:00.000Z"), note: "Jan" },
      { amount: 75000, paidAt: new Date("2026-02-10T12:00:00.000Z"), note: "Feb" },
    ],
    status: "active",
  };
  syncInstallmentCommitment(doc, "2026-03-01");
  assert.equal(doc.outstandingBalance, 0);
  assert.equal(doc.installmentsPaid, 2);
  assert.equal(doc.status, "active");
  assert.ok(doc.nextDueDate);
});

test("syncInstallmentCommitment reduces outstanding after payments", () => {
  const doc = {
    totalAmount: 1000,
    installmentAmount: 100,
    frequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    endDate: null,
    status: "active",
    payments: [{ amount: 250, paidAt: new Date("2026-01-10T12:00:00.000Z") }],
  };
  syncInstallmentCommitment(doc, "2026-06-01");
  assert.equal(doc.outstandingBalance, 750);
  assert.equal(doc.installmentsPaid, 2);
});

test("syncInstallmentCommitment does not count down payment toward installments paid", () => {
  const doc = {
    totalAmount: 100000,
    installmentAmount: 5000,
    frequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    endDate: null,
    status: "active",
    payments: [
      {
        amount: 20000,
        paidAt: new Date("2025-12-15T12:00:00.000Z"),
        note: "Down payment",
      },
    ],
  };
  syncInstallmentCommitment(doc, "2026-06-01");
  assert.equal(doc.outstandingBalance, 80000);
  assert.equal(doc.installmentsPaid, 0);
});

test("syncInstallmentCommitment does not count balloon payment toward installments paid", () => {
  const doc = {
    totalAmount: 100000,
    installmentAmount: 5000,
    frequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    endDate: null,
    status: "active",
    payments: [
      {
        amount: 5000,
        paidAt: new Date("2026-01-01T12:00:00.000Z"),
        note: "Installment",
      },
      {
        amount: 15000,
        paidAt: new Date("2026-06-01T12:00:00.000Z"),
        note: "Balloon payment",
      },
    ],
  };
  syncInstallmentCommitment(doc, "2026-06-15");
  assert.equal(doc.outstandingBalance, 80000);
  assert.equal(doc.installmentsPaid, 1);
});

test("default kameti end date spans one month per participant", () => {
  assert.equal(defaultKametiEndYmdFromParticipants("2026-01-15", 1), "2026-01-15");
  assert.equal(defaultKametiEndYmdFromParticipants("2026-01-15", 12), "2026-12-15");
});

test("kameti payout does not zero remaining contributions automatically", () => {
  const doc = {
    planName: "Test",
    totalParticipants: 10,
    poolAmountPerRound: 10000,
    contributionAmount: 1000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    contributionPayments: [
      { amount: 1000, paidAt: new Date("2026-01-05T12:00:00.000Z") },
    ],
    payoutAmount: 50000,
    payoutReceivedAt: new Date("2026-06-01T12:00:00.000Z"),
    status: "active",
  };
  syncKametiPlan(doc, "2026-06-15");
  assert.ok(doc.remainingContributionsOwed > 0);
  assert.equal(doc.status, "payout_received");
});

test("kameti remaining uses rounds left times per-person share", () => {
  const doc = {
    planName: "Office Kameti",
    totalParticipants: 12,
    poolAmountPerRound: 1_200_000,
    contributionAmount: 100_000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-05-01T12:00:00.000Z"),
    contributionPayments: Array.from({ length: 5 }, (_, index) => ({
      amount: 100_000,
      paidAt: new Date(`2026-0${5 + index}-01T12:00:00.000Z`),
    })),
    status: "active",
  };
  syncKametiPlan(doc, "2026-11-01");
  assert.equal(doc.contributionsPaidCount, 5);
  assert.equal(doc.remainingContributionsOwed, 700_000);
  assert.equal(doc.status, "active");
});

test("kameti infers payout received when a round after payout month is paid", () => {
  const doc = {
    planName: "Office Kameti",
    totalParticipants: 12,
    poolAmountPerRound: 1_200_000,
    contributionAmount: 100_000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-05-01T12:00:00.000Z"),
    expectedPayoutDate: new Date("2026-07-01T12:00:00.000Z"),
    contributionPayments: Array.from({ length: 5 }, (_, index) => ({
      amount: 100_000,
      paidAt: new Date(`2026-0${5 + index}-01T12:00:00.000Z`),
    })),
    payoutReceivedAt: null,
    payoutAmount: null,
    status: "active",
  };
  syncKametiPlan(doc, "2026-11-01");
  assert.ok(doc.payoutReceivedAt);
  assert.equal(doc.payoutAmount, 1_100_000);
  assert.equal(doc.status, "payout_received");
});

test("kameti calendar pins unpaid current or previous month to today", () => {
  const doc = {
    planName: "Office Kameti",
    totalParticipants: 12,
    contributionAmount: 100_000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-05-01T12:00:00.000Z"),
    contributionPayments: Array.from({ length: 5 }, (_, index) => ({
      amount: 100_000,
      paidAt: new Date(`2026-0${5 + index}-01T12:00:00.000Z`),
    })),
    remainingContributionsOwed: 700_000,
    status: "payout_received",
  };
  assert.equal(
    kametiCalendarContributionDisplayYmd(doc, { todayYmd: "2026-11-15" }),
    "2026-11-15",
  );
});

test("isDuplicatePayment detects identical records", () => {
  const paidAt = new Date("2026-03-01T12:00:00.000Z");
  assert.equal(
    isDuplicatePayment([{ amount: 50, paidAt }], { amount: 50, paidAt }),
    true,
  );
});

test("sortPaymentsByPaidAtAsc orders payments oldest first", () => {
  const sorted = sortPaymentsByPaidAtAsc([
    { amount: 10, paidAt: new Date("2026-03-01T12:00:00.000Z") },
    { amount: 20, paidAt: new Date("2026-01-01T12:00:00.000Z") },
    { amount: 30, paidAt: new Date("2026-02-01T12:00:00.000Z") },
  ]);
  assert.equal(sorted[0].amount, 20);
  assert.equal(sorted[2].amount, 10);
});

test("tour calendar spans start through end dates", () => {
  const entries = buildTourCalendarEntries({
    _id: "507f1f77bcf86cd799439011",
    name: "Trip",
    startDate: new Date("2026-07-01T12:00:00.000Z"),
    endDate: new Date("2026-07-03T12:00:00.000Z"),
    bookingStatus: "planning",
  });
  assert.equal(entries.length, 3);
});
