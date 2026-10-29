import test from "node:test";
import assert from "node:assert/strict";
import { advanceYmdByFrequency, inclusiveDurationDays } from "../../lib/schedules/frequency.js";
import { syncInstallmentCommitment } from "../../lib/planning/installments.js";
import { syncKametiPlan } from "../../lib/planning/kameti.js";
import { isDuplicatePayment } from "../../lib/payments/mongoose.js";
import { buildTourCalendarEntries } from "../../lib/calendar/planning-entries.js";

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

test("kameti payout does not zero remaining contributions automatically", () => {
  const doc = {
    planName: "Test",
    totalParticipants: 10,
    contributionAmount: 1000,
    contributionFrequency: "monthly",
    startDate: new Date("2026-01-01T12:00:00.000Z"),
    contributionPayments: [{ amount: 2000, paidAt: new Date("2026-01-05T12:00:00.000Z") }],
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
