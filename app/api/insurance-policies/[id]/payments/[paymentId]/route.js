import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { syncInsurancePolicy } from "@/lib/planning/insurance";
import InsurancePolicy from "@/models/InsurancePolicy";

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { id, paymentId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(paymentId)) {
    return jsonError("Invalid id", 400);
  }

  await connectDB();
  const record = await InsurancePolicy.findById(id);
  if (!record) {
    return jsonError("Insurance policy not found", 404);
  }

  const payment = record.payments.id(paymentId);
  if (!payment) {
    return jsonError("Payment not found", 404);
  }

  record.payments.pull(paymentId);
  syncInsurancePolicy(record, new Date().toISOString().slice(0, 10));
  await record.save();
  return jsonOk(record.toObject());
}
