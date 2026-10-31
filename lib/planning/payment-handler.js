import { validatePaymentAmount } from "@/lib/finance/balance";
import { validatePlanningPayment } from "@/lib/planning/validate";
import { isDuplicatePayment } from "@/lib/payments/mongoose";
import { jsonError } from "@/lib/api-response";

export async function applyPlanningPayment({
  record,
  paymentsField,
  body,
  syncFn,
  todayYmd,
  validateFn = validatePlanningPayment,
}) {
  const validated = validateFn(body);
  if (!validated.ok) {
    return { error: jsonError("Validation failed", 422, validated.errors) };
  }

  const payments = record[paymentsField] || [];
  if (isDuplicatePayment(payments, validated.value)) {
    return { error: jsonError("Duplicate payment record", 409) };
  }

  const amountCheck = validatePaymentAmount(
    validated.value.amount,
    record.outstandingBalance,
  );
  if (paymentsField === "contributionPayments") {
    const roundsPaid = record.contributionPayments?.length ?? 0;
    if (roundsPaid >= record.totalParticipants) {
      return {
        error: jsonError("All contribution rounds are already recorded", 422),
      };
    }
    const balanceCheck = validatePaymentAmount(
      validated.value.amount,
      record.remainingContributionsOwed,
    );
    if (!balanceCheck.ok) {
      return { error: jsonError(balanceCheck.error, 422) };
    }
  } else if (paymentsField === "paymentHistory") {
    // subscription payments are logged; no balance cap required beyond positive amount
  } else if (paymentsField === "payments" && record.openEnded) {
    // open-ended contributions: any positive amount
  } else if (!amountCheck.ok) {
    return { error: jsonError(amountCheck.error, 422) };
  }

  record[paymentsField].push(validated.value);
  if (syncFn) {
    syncFn(record, todayYmd);
  }
  await record.save();
  return { record };
}
