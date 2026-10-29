import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import {
  validateApplicationCreate,
  validateApplicationUpdate,
} from "@/lib/planning/validate";
import UniversityApplication from "@/models/UniversityApplication";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { page, limit, skip } = parsePagination(new URL(request.url).searchParams);
  await connectDB();
  const items = await UniversityApplication.find({})
    .sort({ applicationDeadline: 1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await UniversityApplication.countDocuments({});
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
  const validated = validateApplicationCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  await connectDB();
  const doc = await UniversityApplication.create(validated.value);
  return jsonOk(doc.toObject(), 201);
}
