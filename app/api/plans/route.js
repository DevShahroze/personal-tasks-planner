import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import { parsePagination, parsePlanSort, validatePlanCreate } from "@/lib/validations";
import { sanitizeTextSearch } from "@/lib/security/task-filters";
import { PLAN_STATUSES } from "@/lib/constants";
import Plan from "@/models/Plan";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const sort = parsePlanSort(searchParams);
  const search = sanitizeTextSearch(searchParams.get("search") || "");
  const status = searchParams.get("status");

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (status && PLAN_STATUSES.includes(status)) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    Plan.find(filter, {
      title: 1,
      description: 1,
      status: 1,
      startDate: 1,
      targetDate: 1,
      updatedAt: 1,
      linkedTasks: 1,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Plan.countDocuments(filter),
  ]);

  const mapped = items.map((item) => ({
    ...item,
    linkedTaskCount: item.linkedTasks?.length || 0,
  }));

  return jsonOk({
    items: mapped,
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
  const body = parsed.body;

  const { errors, value } = validatePlanCreate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const plan = await Plan.create(value);
  return jsonOk(plan, 201);
}
