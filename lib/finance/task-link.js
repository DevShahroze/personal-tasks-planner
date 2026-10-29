import Task from "@/models/Task";
import { isValidObjectId } from "@/lib/api-response";

export async function assertLinkedTaskId(taskId) {
  if (!taskId) {
    return { ok: true, task: null };
  }
  if (!isValidObjectId(String(taskId))) {
    return { ok: false, error: "Invalid linked task" };
  }
  const task = await Task.findById(taskId, { _id: 1, title: 1 }).lean();
  if (!task) {
    return { ok: false, error: "Linked task not found" };
  }
  return { ok: true, task };
}

export async function assertTaskExists(taskId) {
  if (!isValidObjectId(String(taskId))) {
    return { ok: false, error: "Invalid task id" };
  }
  const task = await Task.findById(taskId, { _id: 1, parentTaskId: 1 }).lean();
  if (!task) {
    return { ok: false, error: "Task not found" };
  }
  return { ok: true, task };
}
