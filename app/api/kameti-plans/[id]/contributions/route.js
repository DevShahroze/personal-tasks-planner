import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { applyPlanningPayment } from "@/lib/planning/payment-handler";
import {
  kametiContributionPaymentDescription,
  syncKametiPlan,
} from "@/lib/planning/kameti";
import KametiPlan from "@/models/KametiPlan";

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
  const todayYmd =
    new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);

  await connectDB();
  const record = await KametiPlan.findById(id);
  if (!record) {
    return jsonError("Kameti plan not found", 404);
  }

  const paymentBody = { ...parsed.body };
  const roundIndex = record.contributionPayments?.length ?? 0;
  if (!paymentBody.note?.trim()) {
    paymentBody.note = kametiContributionPaymentDescription(
      record.toObject(),
      roundIndex,
    );
  }

  const result = await applyPlanningPayment({
    record,
    paymentsField: "contributionPayments",
    body: paymentBody,
    syncFn: syncKametiPlan,
    todayYmd,
  });
  if (result.error) {
    return result.error;
  }
  return jsonOk(result.record.toObject(), 201);
}
