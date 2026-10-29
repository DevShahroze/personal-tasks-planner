import { connectDB } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api-response";
import { mergeWithTopLevelFilter } from "@/lib/subtasks/constants";
import Task from "@/models/Task";
import Thought from "@/models/Thought";
import Plan from "@/models/Plan";
import InstallmentCommitment from "@/models/InstallmentCommitment";
import Subscription from "@/models/Subscription";
import UniversityApplication from "@/models/UniversityApplication";
import Tour from "@/models/Tour";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) {
    return jsonError(auth.error, auth.status);
  }

  await connectDB();
  const now = new Date();

  const [
    totalTasks,
    tasksToDo,
    tasksInProgress,
    completedTasks,
    highPriorityTasks,
    totalThoughts,
    totalPlans,
    activePlans,
    activeInstallments,
    overdueInstallments,
    activeSubscriptions,
    openApplications,
    upcomingTours,
  ] = await Promise.all([
    Task.countDocuments(mergeWithTopLevelFilter()),
    Task.countDocuments(mergeWithTopLevelFilter({ status: "To Do" })),
    Task.countDocuments(mergeWithTopLevelFilter({ status: "In Progress" })),
    Task.countDocuments(mergeWithTopLevelFilter({ status: "Completed" })),
    Task.countDocuments(
      mergeWithTopLevelFilter({
        status: { $nin: ["Completed", "Cancelled"] },
        priority: { $in: ["High", "Urgent"] },
      }),
    ),
    Thought.countDocuments(),
    Plan.countDocuments(),
    Plan.countDocuments({ status: "Active" }),
    InstallmentCommitment.countDocuments({ status: "active" }),
    InstallmentCommitment.countDocuments({ status: "overdue" }),
    Subscription.countDocuments({ status: "active" }),
    UniversityApplication.countDocuments({
      applicationStatus: { $nin: ["accepted", "rejected", "withdrawn"] },
    }),
    Tour.countDocuments({ endDate: { $gte: now } }),
  ]);

  return jsonOk({
    totalTasks,
    tasksToDo,
    tasksInProgress,
    completedTasks,
    highPriorityTasks,
    totalThoughts,
    totalPlans,
    activePlans,
    activeInstallments,
    overdueInstallments,
    activeSubscriptions,
    openApplications,
    upcomingTours,
  });
}
