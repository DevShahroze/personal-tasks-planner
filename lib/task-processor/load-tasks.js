import { connectDB } from "@/lib/mongodb.js";
import Task from "@/models/Task.js";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants.js";

export async function loadTopLevelTasksForRollover(rolloverStatuses) {
  await connectDB();
  return Task.find(
    mergeWithTopLevelFilter({
      status: { $in: rolloverStatuses },
    }),
  ).lean();
}
