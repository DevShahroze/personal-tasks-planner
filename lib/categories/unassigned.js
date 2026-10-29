import Category from "@/models/Category";
import { UNASSIGNED_CATEGORY_NAME } from "@/lib/constants";

export async function findOrCreateUnassignedCategory() {
  const existing = await Category.findOne({ name: UNASSIGNED_CATEGORY_NAME });
  if (existing) {
    return existing;
  }
  try {
    return await Category.create({ name: UNASSIGNED_CATEGORY_NAME });
  } catch (err) {
    if (err.code === 11000) {
      return Category.findOne({ name: UNASSIGNED_CATEGORY_NAME });
    }
    throw err;
  }
}
