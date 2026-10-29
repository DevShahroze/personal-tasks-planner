import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { validateTourExpense } from "@/lib/planning/validate";
import { syncTour } from "@/lib/planning/tours";
import Tour from "@/models/Tour";

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
  const validated = validateTourExpense(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const record = await Tour.findById(id);
  if (!record) {
    return jsonError("Tour not found", 404);
  }

  record.expenses.push(validated.value);
  syncTour(record);
  await record.save();
  return jsonOk(record.toObject(), 201);
}
