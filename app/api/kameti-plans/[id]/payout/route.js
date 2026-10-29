import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateKametiPayout } from "@/lib/planning/validate";
import { syncKametiPlan } from "@/lib/planning/kameti";
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
  const validated = validateKametiPayout(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  const todayYmd =
    new URL(request.url).searchParams.get("todayYmd") ||
    new Date().toISOString().slice(0, 10);

  await connectDB();
  const record = await KametiPlan.findById(id);
  if (!record) {
    return jsonError("Kameti plan not found", 404);
  }

  record.payoutAmount = validated.value.payoutAmount;
  record.payoutReceivedAt = validated.value.payoutReceivedAt;
  syncKametiPlan(record, todayYmd);
  await record.save();

  return jsonOk(record.toObject(), 201);
}
