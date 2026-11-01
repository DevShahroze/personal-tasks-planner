import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import {
  parseImportantInfoSort,
  parsePagination,
  validateImportantInfoCreate,
} from "@/lib/validations";
import { sanitizeTextSearch } from "@/lib/security/task-filters";
import { IMPORTANT_INFO_CATEGORIES } from "@/lib/important-info/constants";
import ImportantInfo from "@/models/ImportantInfo";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const sort = parseImportantInfoSort(searchParams);
  const search = sanitizeTextSearch(searchParams.get("search") || "");
  const category = searchParams.get("category");

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (category && IMPORTANT_INFO_CATEGORIES.includes(category)) {
    filter.category = category;
  }

  const [items, total] = await Promise.all([
    ImportantInfo.find(filter, {
      title: 1,
      category: 1,
      subjectName: 1,
      updatedAt: 1,
    })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ImportantInfo.countDocuments(filter),
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
  const body = parsed.body;

  const { errors, value } = validateImportantInfoCreate(body);
  if (errors.length) {
    return jsonError("Validation failed", 400, errors);
  }

  await connectDB();
  const record = await ImportantInfo.create(value);
  return jsonOk(record, 201);
}
