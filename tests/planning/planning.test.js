import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceYmdByFrequency,
  inclusiveDurationDays,
} from "../../lib/schedules/frequency.js";
import { syncInstallmentCommitment } from "../../lib/planning/installments.js";
import { syncKametiPlan } from "../../lib/planning/kameti.js";
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
import { buildTourCalendarEntries } from "../../lib/calendar/planning-entries.js";

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
  assert.equal(result.patch.totalAmount, 5000);
  assert.equal(result.patch.installmentAmount, 500);
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

test("advanceYmdByFrequency moves monthly dates", () => {
  assert.equal(advanceYmdByFrequency("2026-01-15", "monthly"), "2026-02-15");
});

test("inclusiveDurationDays counts both endpoints", () => {
  assert.equal(inclusiveDurationDays("2026-06-01", "2026-06-03"), 3);
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

test("kameti payout does not zero remaining contributions automatically", () => {
  const doc = {
    planName: "Test",
    totalParticipants: 10,
    contributionAmount: 1000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    contributionPayments: [
      { amount: 2000, paidAt: new Date("2026-01-05T12:00:00.000Z") },
    ],
    payoutAmount: 50000,
    payoutReceivedAt: new Date("2026-06-01T12:00:00.000Z"),
    status: "active",
  };
  syncKametiPlan(doc, "2026-06-15");
  assert.ok(doc.remainingContributionsOwed > 0);
  assert.equal(doc.status, "payout_received");
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
