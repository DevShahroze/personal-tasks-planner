import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants";
import { sanitizeTextSearch } from "@/lib/security/task-filters";
import Task from "@/models/Task";
import Thought from "@/models/Thought";
import Plan from "@/models/Plan";

export async function GET(request) {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  const { searchParams } = new URL(request.url);
  const q = sanitizeTextSearch(searchParams.get("q") || "");

  await connectDB();

  const filter = q
    ? { $and: [{ $text: { $search: q } }, mergeWithTopLevelFilter()] }
    : mergeWithTopLevelFilter();

  const [tasks, thoughts, plans] = await Promise.all([
    Task.find(filter, { title: 1 }).sort({ updatedAt: -1 }).limit(15).lean(),
    Thought.find(q ? { $text: { $search: q } } : {}, { title: 1 })
      .sort({ updatedAt: -1 })
      .limit(15)
      .lean(),
    Plan.find(q ? { $text: { $search: q } } : {}, { title: 1 })
      .sort({ updatedAt: -1 })
      .limit(15)
      .lean(),
  ]);

  return jsonOk({ tasks, thoughts, plans });
}
