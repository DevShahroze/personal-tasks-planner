import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import {
  parsePagination,
  parseThoughtSort,
  validateThoughtCreate,
} from "@/lib/validations";
import { sanitizeTextSearch } from "@/lib/security/task-filters";
import Thought from "@/models/Thought";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const sort = parseThoughtSort(searchParams);
  const search = sanitizeTextSearch(searchParams.get("search") || "");

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }

  const [items, total] = await Promise.all([
    Thought.find(filter, {
      title: 1,
      content: 1,
      createdAt: 1,
      updatedAt: 1,
      linkedTasks: 1,
      linkedPlans: 1,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Thought.countDocuments(filter),
  ]);

  const mapped = items.map((item) => ({
    ...item,
    linkedTaskCount: item.linkedTasks?.length || 0,
    linkedPlanCount: item.linkedPlans?.length || 0,
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

  const { errors, value } = validateThoughtCreate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const thought = await Thought.create(value);
  return jsonOk(thought, 201);
}
