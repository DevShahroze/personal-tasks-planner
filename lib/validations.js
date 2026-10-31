import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  PLAN_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./constants";
import {
  MAX_CATEGORY_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_THOUGHT_CONTENT_LENGTH,
  MAX_TITLE_LENGTH,
} from "./security/constants";
import { scheduleForCreate } from "./scheduling/validate.js";
import { recurrenceForCreate } from "./recurrence/validate.js";
import { DEFAULT_SCHEDULE_TIMEZONE } from "./scheduling/constants.js";
import {
  applyTaskCommerceToCreate,
  applyTaskCommercePatch,
} from "./task-commerce/validate.js";

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function parsePagination(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  let limit =
    parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;
  limit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function validateTaskCreate(body) {
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

  const scheduleResult = scheduleForCreate(body);
  if (!scheduleResult.ok) {
    errors.push(...scheduleResult.errors);
  }

  const timeZone = scheduleResult.ok
    ? scheduleResult.value?.timezone || DEFAULT_SCHEDULE_TIMEZONE
    : body?.schedule?.timezone || DEFAULT_SCHEDULE_TIMEZONE;
  const recurrenceResult = recurrenceForCreate(body, timeZone);
  if (!recurrenceResult.ok) {
    errors.push(...recurrenceResult.errors);
  }

  const value = {
    title,
    description: limitString(body.description, MAX_DESCRIPTION_LENGTH),
    status,
    priority,
    category: body.category || null,
    taskDate: body.taskDate ? new Date(body.taskDate) : null,
    timelineStart: body.timelineStart ? new Date(body.timelineStart) : null,
    timelineEnd: body.timelineEnd ? new Date(body.timelineEnd) : null,
    schedule: scheduleResult.ok ? scheduleResult.value : undefined,
    recurrence: recurrenceResult.ok ? recurrenceResult.value : undefined,
  };
  applyTaskCommerceToCreate(body, value, errors);

  return {
    errors,
    value,
  };
}

export function validateTaskUpdate(body) {
  const patch = {};
  const errors = [];

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = title;
    }
  }

  if (body.description !== undefined) {
    patch.description = limitString(body.description, MAX_DESCRIPTION_LENGTH);
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

  if (body.category !== undefined) {
    patch.category = body.category || null;
  }

  if (body.taskDate !== undefined) {
    patch.taskDate = body.taskDate ? new Date(body.taskDate) : null;
  }

  if (body.timelineStart !== undefined) {
    patch.timelineStart = body.timelineStart ? new Date(body.timelineStart) : null;
  }

  if (body.timelineEnd !== undefined) {
    patch.timelineEnd = body.timelineEnd ? new Date(body.timelineEnd) : null;
  }

  applyTaskCommercePatch(body, patch, errors);

  return { errors, patch };
}

export function validateThoughtCreate(body) {
  const errors = [];
  const title = limitString(body.title, MAX_TITLE_LENGTH);
  if (!title) {
    errors.push("Title is required");
  }
  return {
    errors,
    value: {
      title,
      content: limitString(body.content, MAX_THOUGHT_CONTENT_LENGTH),
    },
  };
}

export function validateThoughtUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = title;
    }
  }
  if (body.content !== undefined) {
    patch.content = limitString(body.content, MAX_THOUGHT_CONTENT_LENGTH);
  }
  return { errors, patch };
}

export function validatePlanCreate(body) {
  const errors = [];
  const title = limitString(body.title, MAX_TITLE_LENGTH);
  if (!title) {
    errors.push("Title is required");
  }
  const status = body.status || "Considering";
  if (!PLAN_STATUSES.includes(status)) {
    errors.push("Invalid status");
  }
  return {
    errors,
    value: {
      title,
      description: limitString(body.description, MAX_DESCRIPTION_LENGTH),
      status,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
    },
  };
}

export function validatePlanUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = title;
    }
  }
  if (body.description !== undefined) {
    patch.description = limitString(body.description, MAX_DESCRIPTION_LENGTH);
  }
  if (body.status !== undefined) {
    if (!PLAN_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }
  if (body.startDate !== undefined) {
    patch.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.targetDate !== undefined) {
    patch.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  }
  return { errors, patch };
}

export function validateCategoryName(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { ok: false, error: "Name is required" };
  }
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return { ok: false, error: "Name is too long" };
  }
  return { ok: true, value: trimmed };
}

const TASK_SORT_FIELDS = {
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  taskDate: "taskDate",
  priority: "priority",
  title: "title",
};

export function parseTaskSort(searchParams) {
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const field = TASK_SORT_FIELDS[sortBy] || "updatedAt";
  return { [field]: sortOrder };
}

export function parseThoughtSort(searchParams) {
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const field = sortBy === "createdAt" ? "createdAt" : "updatedAt";
  return { [field]: sortOrder };
}

export function parsePlanSort(searchParams) {
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const map = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    targetDate: "targetDate",
  };
  const field = map[sortBy] || "updatedAt";
  return { [field]: sortOrder };
}
