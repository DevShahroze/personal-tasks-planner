import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { readJsonBody } from "@/lib/security/request";
import { jsonError, jsonOk, isValidObjectId } from "@/lib/api-response";
import { validateCategoryName } from "@/lib/validations";
import Category from "@/models/Category";
import Task from "@/models/Task";

export async function PATCH(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid category id", 400);
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
    const category = await Category.findByIdAndUpdate(
      id,
      { name: nameResult.value },
      { new: true, runValidators: true },
    ).lean();

    if (!category) {
      return jsonError("Category not found", 404);
    }

    return jsonOk(category);
  } catch (err) {
    if (err.code === 11000) {
      return jsonError("Category name already exists", 409);
    }
    return jsonError("Failed to update category", 500);
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return jsonError("Invalid category id", 400);
  }

  await connectDB();

  const category = await Category.findById(id);
  if (!category) {
    return jsonError("Category not found", 404);
  }

  await Task.updateMany({ category: id }, { $set: { category: null } });
  await Category.findByIdAndDelete(id);

  return jsonOk({ ok: true });
}
