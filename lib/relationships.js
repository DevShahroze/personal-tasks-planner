import mongoose from "mongoose";
import Task from "@/models/Task";
import Thought from "@/models/Thought";
import Plan from "@/models/Plan";

export async function removeTaskReferences(taskId) {
  const id = new mongoose.Types.ObjectId(taskId);
  await Promise.all([
    Thought.updateMany({ linkedTasks: id }, { $pull: { linkedTasks: id } }),
    Plan.updateMany({ linkedTasks: id }, { $pull: { linkedTasks: id } }),
  ]);
}

export async function removeThoughtReferences(thoughtId) {
  const id = new mongoose.Types.ObjectId(thoughtId);
  await Promise.all([
    Task.updateMany({ linkedThoughts: id }, { $pull: { linkedThoughts: id } }),
    Plan.updateMany({ linkedThoughts: id }, { $pull: { linkedThoughts: id } }),
  ]);
}

export async function removePlanReferences(planId) {
  const id = new mongoose.Types.ObjectId(planId);
  await Promise.all([
    Task.updateMany({ linkedPlans: id }, { $pull: { linkedPlans: id } }),
    Thought.updateMany({ linkedPlans: id }, { $pull: { linkedPlans: id } }),
  ]);
}

export async function linkTaskThought(taskId, thoughtId) {
  await Promise.all([
    Task.findByIdAndUpdate(taskId, {
      $addToSet: { linkedThoughts: thoughtId },
    }),
    Thought.findByIdAndUpdate(thoughtId, {
      $addToSet: { linkedTasks: taskId },
    }),
  ]);
}

export async function unlinkTaskThought(taskId, thoughtId) {
  await Promise.all([
    Task.findByIdAndUpdate(taskId, {
      $pull: { linkedThoughts: thoughtId },
    }),
    Thought.findByIdAndUpdate(thoughtId, {
      $pull: { linkedTasks: taskId },
    }),
  ]);
}

export async function linkTaskPlan(taskId, planId) {
  await Promise.all([
    Task.findByIdAndUpdate(taskId, { $addToSet: { linkedPlans: planId } }),
    Plan.findByIdAndUpdate(planId, { $addToSet: { linkedTasks: taskId } }),
  ]);
}

export async function unlinkTaskPlan(taskId, planId) {
  await Promise.all([
    Task.findByIdAndUpdate(taskId, { $pull: { linkedPlans: planId } }),
    Plan.findByIdAndUpdate(planId, { $pull: { linkedTasks: taskId } }),
  ]);
}

export async function linkThoughtPlan(thoughtId, planId) {
  await Promise.all([
    Thought.findByIdAndUpdate(thoughtId, {
      $addToSet: { linkedPlans: planId },
    }),
    Plan.findByIdAndUpdate(planId, {
      $addToSet: { linkedThoughts: thoughtId },
    }),
  ]);
}

export async function unlinkThoughtPlan(thoughtId, planId) {
  await Promise.all([
    Thought.findByIdAndUpdate(thoughtId, {
      $pull: { linkedPlans: planId },
    }),
    Plan.findByIdAndUpdate(planId, {
      $pull: { linkedThoughts: thoughtId },
    }),
  ]);
}
