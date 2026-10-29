import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateFinancialPaymentCreate } from "@/lib/finance/validate";
import {
  computeOutstandingBalance,
  deriveFinancialStatus,
  validatePaymentAmount,
} from "@/lib/finance/balance";
import FinancialRecord from "@/models/FinancialRecord";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid record id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateFinancialPaymentCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const record = await FinancialRecord.findById(id);
  if (!record) {
    return jsonError("Financial record not found", 404);
  }

  if (record.status === "settled" || record.outstandingBalance <= 0) {
    return jsonError("Record is already settled", 400);
  }

  const amountCheck = validatePaymentAmount(
    validated.value.amount,
    record.outstandingBalance,
  );
  if (!amountCheck.ok) {
    return jsonError(amountCheck.error, 422);
  }

  record.payments.push({
    amount: amountCheck.value,
    paidAt: validated.value.paidAt,
    note: validated.value.note,
  });

  record.outstandingBalance = computeOutstandingBalance(
    record.originalAmount,
    record.payments,
  );
  record.status = deriveFinancialStatus(
    record.originalAmount,
    record.outstandingBalance,
  );
  await record.save();

  const updated = await FinancialRecord.findById(id).populate("taskId", "title").lean();
  return jsonOk(updated, 201);
}
