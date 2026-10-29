import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { readJsonBody } from "@/lib/security/request";
import { parsePagination } from "@/lib/validations";
import { validateSubscriptionCreate } from "@/lib/planning/validate";
import { syncSubscription } from "@/lib/planning/subscriptions";
import Subscription from "@/models/Subscription";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }
  const { page, limit, skip } = parsePagination(new URL(request.url).searchParams);
  await connectDB();
  const items = await Subscription.find({})
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const total = await Subscription.countDocuments({});
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
  const validated = validateSubscriptionCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }
  await connectDB();
  const doc = new Subscription(validated.value);
  syncSubscription(doc, new Date().toISOString().slice(0, 10));
  await doc.save();
  return jsonOk(doc.toObject(), 201);
}
