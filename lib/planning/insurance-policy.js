import { roundMoney } from "../finance/balance.js";
import { addIntervalToYmd, dateToYmd } from "../recurrence/calculate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "../scheduling/constants.js";
import { ymdForAnnualDue } from "./insurance.js";

export function deriveYearlyPremiumFromSubmissions(annualSubmissions) {
  if (!Array.isArray(annualSubmissions) || !annualSubmissions.length) {
    return null;
  }
  const sorted = [...annualSubmissions].sort((a, b) => b.year - a.year);
  const amount = Number(sorted[0].amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return roundMoney(amount);
}

export function resolveInsuranceStartYmd(doc) {
  const month = doc.premiumDueMonth ?? 12;
  const day = doc.premiumDueDay ?? 31;
  const submissions = doc.annualSubmissions || [];
  let startYear = submissions.length
    ? Math.min(...submissions.map((row) => row.year))
    : null;
  if (!startYear && doc.startDate) {
    startYear = Number(dateToYmd(doc.startDate, DEFAULT_SCHEDULE_TIMEZONE).slice(0, 4));
  }
  if (!startYear) {
    startYear = new Date().getFullYear();
  }
  return ymdForAnnualDue(startYear, month, day);
}

export function normalizeInsuranceDocument(doc) {
  const paymentYears = Math.max(
    1,
    Number(doc.premiumPaymentYears ?? doc.termYears ?? doc.totalPremiumPayments) || 1,
  );
  const maturityYears = Math.max(
    paymentYears,
    Number(doc.maturityYears) || paymentYears,
  );

  doc.frequency = "yearly";
  doc.customIntervalDays = null;
  doc.premiumPaymentYears = paymentYears;
  doc.termYears = paymentYears;
  doc.totalPremiumPayments = paymentYears;
  doc.premiumDueMonth = doc.premiumDueMonth ?? 12;
  doc.premiumDueDay = doc.premiumDueDay ?? 31;
  doc.maturityYears = maturityYears;

  if (!doc.insurerName) {
    doc.insurerName = String(doc.policyNumber || "Insurance").trim();
  }

  const derivedYearly = deriveYearlyPremiumFromSubmissions(doc.annualSubmissions);
  if (derivedYearly && (!doc.premiumAmount || doc.premiumAmount <= 0)) {
    doc.premiumAmount = derivedYearly;
  }
  if (doc.premiumAmount > 0) {
    doc.totalPremiumAmount = roundMoney(doc.premiumAmount * paymentYears);
  }

  const startYmd = resolveInsuranceStartYmd(doc);
  doc.startDate = new Date(`${startYmd}T12:00:00.000Z`);

  const paymentEndYmd = addIntervalToYmd(startYmd, paymentYears, "years");
  if (paymentEndYmd) {
    doc.endDate = new Date(`${paymentEndYmd}T12:00:00.000Z`);
  }

  const maturityYmd = addIntervalToYmd(startYmd, maturityYears, "years");
  if (maturityYmd) {
    doc.maturityDate = new Date(`${maturityYmd}T12:00:00.000Z`);
  }

  return doc;
}
