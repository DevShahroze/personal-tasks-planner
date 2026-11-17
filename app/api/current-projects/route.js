import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import { parsePagination } from "@/lib/validations";
import { sanitizeTextSearch } from "@/lib/security/task-filters";
import { CURRENT_PROJECT_STATUSES } from "@/lib/current-projects/constants";
import {
  parseCurrentProjectSort,
  validateCurrentProjectCreate,
} from "@/lib/current-projects/validate";
import CurrentProject from "@/models/CurrentProject";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const sort = parseCurrentProjectSort(searchParams);
  const search = sanitizeTextSearch(searchParams.get("search") || "");
  const status = searchParams.get("status");

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (status && CURRENT_PROJECT_STATUSES.includes(status)) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    CurrentProject.find(filter, {
      title: 1,
      summary: 1,
      status: 1,
      startedAt: 1,
      targetDate: 1,
      updatedAt: 1,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    CurrentProject.countDocuments(filter),
  ]);

  return jsonOk({
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
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

  const validated = validateCurrentProjectCreate(parsed.body);
  if (!validated.ok) {
    return jsonError("Validation failed", 422, validated.errors);
  }

  await connectDB();
  const doc = await CurrentProject.create(validated.value);
  return jsonOk(doc, 201);
}
