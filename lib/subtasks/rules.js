import Task from "@/models/Task";
import { isValidObjectId } from "@/lib/security/ids.js";

export async function assertValidParentTaskId(parentTaskId, { excludeTaskId } = {}) {
  if (!parentTaskId) {
    return { ok: true, parent: null };
  }
  if (!isValidObjectId(String(parentTaskId))) {
    return { ok: false, error: "Invalid parent task id" };
  }
  if (excludeTaskId && String(parentTaskId) === String(excludeTaskId)) {
    return { ok: false, error: "A task cannot be its own parent" };
  }

  const parent = await Task.findById(parentTaskId, { parentTaskId: 1, category: 1 }).lean();
  if (!parent) {
    return { ok: false, error: "Parent task not found" };
  }
  if (parent.parentTaskId) {
    return { ok: false, error: "Subtasks can only be nested one level deep" };
  }

  if (excludeTaskId) {
    const childCount = await Task.countDocuments({ parentTaskId: excludeTaskId });
    if (childCount > 0) {
      return { ok: false, error: "Tasks with subtasks cannot become subtasks" };
    }
  }

  return { ok: true, parent };
}

export async function findIncompleteSubtasks(parentTaskId) {
  return Task.find(
    {
      parentTaskId,
      status: { $ne: "Completed" },
    },
    { title: 1, status: 1 },
  ).lean();
}

export async function reopenParentIfNeeded(subtask, previousStatus, nextStatus) {
  if (!subtask.parentTaskId) {
    return null;
  }
  if (previousStatus !== "Completed" || nextStatus === "Completed") {
    return null;
  }

  const parent = await Task.findById(subtask.parentTaskId);
  if (!parent || parent.status !== "Completed") {
    return null;
  }

  parent.status = "To Do";
  await parent.save();
  return parent;
}

export async function deleteTaskAndSubtasks(taskId) {
  const subtasks = await Task.find({ parentTaskId: taskId }, { _id: 1 }).lean();
  return { subtaskIds: subtasks.map((item) => String(item._id)) };
}
