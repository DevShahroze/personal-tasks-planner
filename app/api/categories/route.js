import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk } from "@/lib/api-response";
import { validateCategoryName } from "@/lib/validations";
import Category from "@/models/Category";
import Task from "@/models/Task";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();

  const categories = await Category.find({}, { name: 1, createdAt: 1 })
    .sort({ name: 1 })
    .lean();

  const counts = await Task.aggregate([
    { $match: { category: { $ne: null } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const items = categories.map((cat) => ({
    ...cat,
    taskCount: countMap.get(String(cat._id)) || 0,
  }));

  return jsonOk({ items });
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

  const nameResult = validateCategoryName(body.name);
  if (!nameResult.ok) {
    return jsonError(nameResult.error, 400);
  }

  await connectDB();

  try {
    const category = await Category.create({ name: nameResult.value });
    return jsonOk(category, 201);
  } catch (err) {
    if (err.code === 11000) {
      return jsonError("Category name already exists", 409);
    }
    return jsonError("Failed to create category", 500);
  }
}
