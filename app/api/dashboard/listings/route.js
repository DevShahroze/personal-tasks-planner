import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants";
import Task from "@/models/Task";
import Thought from "@/models/Thought";
import Plan from "@/models/Plan";

const listProjection = {
  title: 1,
  status: 1,
  priority: 1,
  taskDate: 1,
  updatedAt: 1,
  createdAt: 1,
};

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();

  const now = new Date();
  const topLevel = mergeWithTopLevelFilter();
  const openStatuses = { $nin: ["Completed", "Cancelled"] };

  const [recentTasks, upcomingTasks, urgentTasks, recentThoughts, recentPlans] =
    await Promise.all([
      Task.find(topLevel, listProjection).sort({ updatedAt: -1 }).limit(5).lean(),
      Task.find(
        mergeWithTopLevelFilter({ taskDate: { $gte: now }, status: openStatuses }),
        listProjection,
      )
        .sort({ taskDate: 1 })
        .limit(5)
        .lean(),
      Task.find(
        mergeWithTopLevelFilter({
          status: openStatuses,
          priority: { $in: ["High", "Urgent"] },
        }),
        listProjection,
      )
        .sort({ priority: -1, updatedAt: -1 })
        .limit(5)
        .lean(),
      Thought.find({}, { title: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
      Plan.find({}, { title: 1, status: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

  return jsonOk({
    recentTasks,
    upcomingTasks,
    urgentTasks,
    recentThoughts,
    recentPlans,
  });
}
