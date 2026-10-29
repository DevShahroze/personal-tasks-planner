import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateFinancialRecordUpdate } from "@/lib/finance/validate";
import { assertLinkedTaskId } from "@/lib/finance/task-link";
import { isFinancialOverdue } from "@/lib/finance/balance";
import FinancialRecord from "@/models/FinancialRecord";

function withOverdue(record, todayYmd) {
  const item = record.toObject ? record.toObject() : record;
  return {
    ...item,
    overdue: isFinancialOverdue(
      item.expectedDate,
      item.outstandingBalance,
      item.status,
      todayYmd,
    ),
  };
}

export async function GET(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid record id", 400);
  }

  const todayYmd =
    new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);

  await connectDB();
  const record = await FinancialRecord.findById(id).populate("taskId", "title").lean();
  if (!record) {
    return jsonError("Financial record not found", 404);
  }

  return jsonOk(withOverdue(record, todayYmd));
}

export async function PATCH(request, { params }) {
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

  const validated = validateFinancialRecordUpdate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const existing = await FinancialRecord.findById(id);
  if (!existing) {
    return jsonError("Financial record not found", 404);
  }

  if (validated.patch.taskId) {
    const link = await assertLinkedTaskId(validated.patch.taskId);
    if (!link.ok) {
      return jsonError(link.error, 400);
    }
  }

  Object.assign(existing, validated.patch);
  await existing.save();

  const updated = await FinancialRecord.findById(id).populate("taskId", "title").lean();
  return jsonOk(updated);
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid record id", 400);
  }

  await connectDB();
  const deleted = await FinancialRecord.findByIdAndDelete(id);
  if (!deleted) {
    return jsonError("Financial record not found", 404);
  }

  return jsonOk({ ok: true });
}
