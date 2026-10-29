import test from "node:test";
import assert from "node:assert/strict";
import { parseMoneyInput } from "../../lib/planning/money-fields.js";
import { validateInstallmentCreate } from "../../lib/planning/validate.js";

test("parseMoneyInput rejects more than two decimal places", () => {
  const errors = [];
  parseMoneyInput("10.999", "amount", errors, { required: true });
  assert.ok(errors.some((message) => message.includes("2 decimal")));
});

test("parseMoneyInput rejects non-numeric values", () => {
  const errors = [];
  parseMoneyInput("abc", "amount", errors, { required: true });
  assert.ok(errors.length);
});

test("validateInstallmentCreate rejects typical installment above total", () => {
  const result = validateInstallmentCreate({
    name: "Loan",
    totalAmount: "100",
    installmentAmount: "150",
    frequency: "monthly",
    startDate: "2026-01-01",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("Typical installment")));
});

test("validateInstallmentCreate rejects prepaid total above commitment", () => {
  const result = validateInstallmentCreate({
    name: "Loan",
    totalAmount: "100",
    installmentAmount: "50",
    frequency: "monthly",
    startDate: "2026-01-01",
    prepaidPaymentsCount: 3,
  });
  assert.equal(result.ok, false);
});
