import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validatePlanningPayment } from "@/lib/planning/validate";
import { isDuplicatePayment } from "@/lib/payments/mongoose";
import { syncSubscription } from "@/lib/planning/subscriptions";
import Subscription from "@/models/Subscription";

export async function POST(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid id", 400);
  }
  const parsed = await readJsonBody(request);
  if (parsed.error) {
    return parsed.error;
  }
  const validated = validatePlanningPayment(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const record = await Subscription.findById(id);
  if (!record) {
    return jsonError("Subscription not found", 404);
  }
  if (isDuplicatePayment(record.paymentHistory, validated.value)) {
    return jsonError("Duplicate payment record", 409);
  }

  record.paymentHistory.push(validated.value);
  syncSubscription(record, new Date().toISOString().slice(0, 10));
  await record.save();
  return jsonOk(record.toObject(), 201);
}
