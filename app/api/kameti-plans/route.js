import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import { validateKametiCreate } from "@/lib/planning/validate";
import { syncKametiPlan } from "@/lib/planning/kameti";
import KametiPlan from "@/models/KametiPlan";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  await connectDB();
  const items = await KametiPlan.find({})
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await KametiPlan.countDocuments({});
  return jsonOk({ items, page, limit, total });
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
  const validated = validateKametiCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  await connectDB();
  const doc = new KametiPlan(validated.value);
  syncKametiPlan(doc, new Date().toISOString().slice(0, 10));
  await doc.save();
  return jsonOk(doc.toObject(), 201);
}
