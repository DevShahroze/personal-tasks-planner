import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import { validateInsuranceCreate } from "@/lib/planning/validate";
import { syncInsurancePolicy } from "@/lib/planning/insurance";
import InsurancePolicy from "@/models/InsurancePolicy";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const filter = {};
  if (status) {
    filter.status = status;
  }

  await connectDB();
  const items = await InsurancePolicy.find(filter)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await InsurancePolicy.countDocuments(filter);

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

  const validated = validateInsuranceCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const doc = new InsurancePolicy(validated.value);
  syncInsurancePolicy(doc, new Date().toISOString().slice(0, 10));
  await doc.save();

  return jsonOk(doc.toObject(), 201);
}
