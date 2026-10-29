import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { applyPlanningPayment } from "@/lib/planning/payment-handler";
import { syncInstallmentCommitment } from "@/lib/planning/installments";
import InstallmentCommitment from "@/models/InstallmentCommitment";

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

  const todayYmd = new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);

  await connectDB();
  const record = await InstallmentCommitment.findById(id);
  if (!record) {
    return jsonError("Installment commitment not found", 404);
  }
  if (record.status === "cancelled" || record.status === "completed") {
    return jsonError("Commitment is not accepting payments", 400);
  }

  const result = await applyPlanningPayment({
    record,
    paymentsField: "payments",
    body: parsed.body,
    syncFn: syncInstallmentCommitment,
    todayYmd,
  });
  if (result.error) {
    return result.error;
  }

  return jsonOk(result.record.toObject(), 201);
}
