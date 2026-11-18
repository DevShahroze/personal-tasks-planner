import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { enforceProcessorIdleResponse } from "@/lib/task-processor/enforce-idle";
import { taskTracksOrderPurchase } from "@/lib/task-commerce/tracking";
import {
  syncTaskAmountSpentFromPayments,
  validateTaskCommercePaymentAmount,
} from "@/lib/task-commerce/order-payment-math";
import { validateTaskCommercePaymentCreate } from "@/lib/task-commerce/order-payments";
import { sortPaymentsByPaidAtInPlace } from "@/lib/payments/sort";
import Task from "@/models/Task";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const processorBlock = await enforceProcessorIdleResponse();
  if (processorBlock) {
    return processorBlock;
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid task id", 400);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }

  const validated = validateTaskCommercePaymentCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const task = await Task.findById(id);
  if (!task) {
    return jsonError("Task not found", 404);
  }

  if (!taskTracksOrderPurchase(task)) {
    return jsonError("Order and purchase tracking is not enabled for this task", 400);
  }

  const amountCheck = validateTaskCommercePaymentAmount(
    validated.value.amount,
    task.estimatedValue,
    task.orderPayments,
  );
  if (!amountCheck.ok) {
    return jsonError(amountCheck.error, 422);
  }

  task.orderPayments.push({
    amount: amountCheck.value,
    paidAt: validated.value.paidAt,
    note: validated.value.note,
  });
  sortPaymentsByPaidAtInPlace(task.orderPayments);
  task.amountSpent = syncTaskAmountSpentFromPayments(task.orderPayments);
  await task.save();

  const updated = await Task.findById(id)
    .populate("category", "name")
    .populate("linkedThoughts", "title")
    .populate("linkedPlans", "title status")
    .lean();

  return jsonOk(updated, 201);
}
