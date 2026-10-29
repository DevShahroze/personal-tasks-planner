import test from "node:test";
import assert from "node:assert/strict";
import {
  computeOutstandingBalance,
  deriveFinancialStatus,
  validatePaymentAmount,
  isFinancialOverdue,
  sumPayments,
} from "../../lib/finance/balance.js";
import { validateTaskNoteCreate } from "../../lib/task-notes/validate.js";
import { buildCalendarEntriesForFinancialRecord } from "../../lib/calendar/financial-entries.js";

test("sumPayments totals payment amounts", () => {
  assert.equal(sumPayments([{ amount: 10 }, { amount: 5.5 }]), 15.5);
});

test("computeOutstandingBalance subtracts payments", () => {
  assert.equal(computeOutstandingBalance(100, [{ amount: 30 }, { amount: 20 }]), 50);
});

test("deriveFinancialStatus reflects balance", () => {
  assert.equal(deriveFinancialStatus(100, 0), "settled");
  assert.equal(deriveFinancialStatus(100, 100), "pending");
  assert.equal(deriveFinancialStatus(100, 40), "partially_paid");
});

test("validatePaymentAmount rejects overpayment", () => {
  const result = validatePaymentAmount(50, 40);
  assert.equal(result.ok, false);
});

test("isFinancialOverdue detects past expected dates", () => {
  assert.equal(isFinancialOverdue("2026-01-01", 10, "pending", "2026-06-01"), true);
  assert.equal(isFinancialOverdue("2026-01-01", 10, "settled", "2026-06-01"), false);
});

test("validateTaskNoteCreate requires content", () => {
  const result = validateTaskNoteCreate({ content: "  " });
  assert.equal(result.ok, false);
});

test("financial calendar entries skip settled records", () => {
  const entries = buildCalendarEntriesForFinancialRecord({
    _id: "507f1f77bcf86cd799439011",
    type: "receivable",
    partyName: "Vendor",
    expectedDate: new Date("2026-06-15T00:00:00.000Z"),
    outstandingBalance: 0,
    status: "settled",
  });
  assert.equal(entries.length, 0);
});

test("financial calendar entries include expected dates", () => {
  const entries = buildCalendarEntriesForFinancialRecord({
    _id: "507f1f77bcf86cd799439011",
    type: "payable",
    partyName: "Shop",
    expectedDate: new Date("2026-06-15T00:00:00.000Z"),
    outstandingBalance: 500,
    status: "pending",
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].kind, "financialExpected");
  assert.equal(entries[0].href, "/financial-records/507f1f77bcf86cd799439011");
});
