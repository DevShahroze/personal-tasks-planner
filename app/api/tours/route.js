import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import { validateTourCreate, validateTourUpdate } from "@/lib/planning/validate";
import { syncTour } from "@/lib/planning/tours";
import Tour from "@/models/Tour";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { page, limit, skip } = parsePagination(new URL(request.url).searchParams);
  await connectDB();
  const items = await Tour.find({}).sort({ startDate: 1 }).skip(skip).limit(limit).lean();
  const total = await Tour.countDocuments({});
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
  const validated = validateTourCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  await connectDB();
  const doc = new Tour(validated.value);
  syncTour(doc);
  await doc.save();
  return jsonOk(doc.toObject(), 201);
}
