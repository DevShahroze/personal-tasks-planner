import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import {
  validateFinancialRecordCreate,
  validateFinancialRecordUpdate,
} from "@/lib/finance/validate";
import { assertLinkedTaskId } from "@/lib/finance/task-link";
import { isFinancialOverdue } from "@/lib/finance/balance";
import {
  FINANCIAL_RECORD_STATUSES,
  FINANCIAL_RECORD_TYPES,
} from "@/lib/finance/constants";
import FinancialRecord from "@/models/FinancialRecord";

function serializeRecord(record, todayYmd) {
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

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const overdueOnly = searchParams.get("overdue") === "1";
  const taskId = searchParams.get("taskId");
  const todayYmd = searchParams.get("todayYmd") || "";

  const filter = {};
  if (type && FINANCIAL_RECORD_TYPES.includes(type)) {
    filter.type = type;
  }
  if (status && FINANCIAL_RECORD_STATUSES.includes(status)) {
    filter.status = status;
  }
  if (taskId && isValidObjectId(taskId)) {
    filter.taskId = taskId;
  }

  if (overdueOnly) {
    const today = todayYmd || new Date().toISOString().slice(0, 10);
    filter.status = { $ne: "settled" };
    filter.outstandingBalance = { $gt: 0 };
    filter.expectedDate = { $lt: new Date(`${today}T00:00:00.000Z`) };
  }

  await connectDB();

  let items = await FinancialRecord.find(filter)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("taskId", "title")
    .lean();

  items = items.map((item) =>
    serializeRecord(item, todayYmd || new Date().toISOString().slice(0, 10)),
  );

  const total = await FinancialRecord.countDocuments(filter);

  return jsonOk({
    items,
    page,
    limit,
    total,
  });
}

export async function POST(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateFinancialRecordCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();

  if (validated.value.taskId) {
    const link = await assertLinkedTaskId(validated.value.taskId);
    if (!link.ok) {
      return jsonError(link.error, 400);
    }
  }

  const created = await FinancialRecord.create(validated.value);
  const populated = await FinancialRecord.findById(created._id)
    .populate("taskId", "title")
    .lean();

  return jsonOk(populated, 201);
}
