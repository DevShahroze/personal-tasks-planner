import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants";
import Task from "@/models/Task";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();

  const topLevel = mergeWithTopLevelFilter();

  const [byStatus, byPriority, byCategory, activity] = await Promise.all([
    Task.aggregate([
      { $match: topLevel },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]),
    Task.aggregate([
      { $match: topLevel },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]),
    Task.aggregate([
      { $match: topLevel },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "cat",
        },
      },
      {
        $group: {
          _id: { $ifNull: [{ $arrayElemAt: ["$cat.name", 0] }, "Uncategorized"] },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]),
    Task.aggregate([
      { $match: topLevel },
      {
        $facet: {
          created: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1, type: "created" } },
          ],
          completed: [
            { $match: { status: "Completed", updatedAt: { $ne: null } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1, type: "completed" } },
          ],
        },
      },
    ]),
  ]);

  return jsonOk({
    tasksByStatus: byStatus,
    tasksByPriority: byPriority,
    tasksByCategory: byCategory,
    taskActivity: activity[0] || { created: [], completed: [] },
  });
}
