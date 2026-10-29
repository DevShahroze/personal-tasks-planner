import mongoose from "mongoose";
import { TASK_PRIORITIES, TASK_STATUSES } from "../constants.js";
import { MAX_SEARCH_LENGTH } from "./constants.js";
import { TOP_LEVEL_PARENT_FILTER } from "../subtasks/constants.js";

export function sanitizeTextSearch(input) {
  if (typeof input !== "string") {
    return "";
  }
  return input.trim().slice(0, MAX_SEARCH_LENGTH).replace(/[\0$]/g, "");
}

export function buildTaskListFilter(searchParams) {
  const filter = {};
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");
  const taskDate = searchParams.get("taskDate");
  const search = sanitizeTextSearch(searchParams.get("search") || "");

  if (status && TASK_STATUSES.includes(status)) {
    filter.status = status;
  }

  if (priority && TASK_PRIORITIES.includes(priority)) {
    filter.priority = priority;
  }

  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = new mongoose.Types.ObjectId(category);
  }

  if (taskDate) {
    const dayStart = new Date(taskDate);
    if (!Number.isNaN(dayStart.getTime())) {
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      filter.taskDate = { $gte: dayStart, $lt: dayEnd };
    }
  }

  if (search) {
    filter.$text = { $search: search };
  }

  return { $and: [filter, TOP_LEVEL_PARENT_FILTER] };
}
