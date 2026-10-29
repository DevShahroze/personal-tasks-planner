import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import { MAX_TITLE_LENGTH } from "@/lib/security/constants";

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function validateSubtaskCreate(body) {
  const errors = [];
  const title = limitString(body.title, MAX_TITLE_LENGTH);
  if (!title) {
    errors.push("Title is required");
  }

  const status = body.status || "To Do";
  if (!TASK_STATUSES.includes(status)) {
    errors.push("Invalid status");
  }

  const priority = body.priority || "Medium";
  if (!TASK_PRIORITIES.includes(priority)) {
    errors.push("Invalid priority");
  }

  if (errors.length) {
    return { ok: false, errors, value: null };
  }

  return {
    ok: true,
    errors: [],
    value: { title, status, priority },
  };
}

export function validateSubtaskUpdate(body) {
  const patch = {};
  const errors = [];

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = limitString(title, MAX_TITLE_LENGTH);
    }
  }

  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }

  if (body.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(body.priority)) {
      errors.push("Invalid priority");
    } else {
      patch.priority = body.priority;
    }
  }

  return { ok: !errors.length, errors, patch };
}
