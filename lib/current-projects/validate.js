import { MAX_DESCRIPTION_LENGTH } from "@/lib/security/constants.js";
import { limitRichText } from "@/lib/rich-text/field.js";
import { CURRENT_PROJECT_STATUSES } from "./constants.js";

const MAX_TITLE = 200;
const MAX_SUMMARY = 500;

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

function parseDate(value, label, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) {
      errors.push(`${label} is required`);
    }
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`Invalid ${label}`);
    return null;
  }
  return date;
}

export function validateCurrentProjectCreate(body) {
  const errors = [];
  const title = limitString(body.title, MAX_TITLE);
  if (!title) {
    errors.push("Title is required");
  }
  const status = body.status || "Active";
  if (!CURRENT_PROJECT_STATUSES.includes(status)) {
    errors.push("Invalid status");
  }
  const startedAt = parseDate(body.startedAt, "start date", errors);
  const targetDate = parseDate(body.targetDate, "target date", errors);
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: {
      title,
      summary: limitString(body.summary, MAX_SUMMARY),
      notes: limitRichText(body.notes, MAX_DESCRIPTION_LENGTH),
      status,
      startedAt,
      targetDate,
    },
  };
}

export function validateCurrentProjectUpdate(body) {
  const patch = {};
  const errors = [];
  if (body.title !== undefined) {
    const title = limitString(body.title, MAX_TITLE);
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = title;
    }
  }
  if (body.summary !== undefined) {
    patch.summary = limitString(body.summary, MAX_SUMMARY);
  }
  if (body.notes !== undefined) {
    patch.notes = limitRichText(body.notes, MAX_DESCRIPTION_LENGTH);
  }
  if (body.status !== undefined) {
    if (!CURRENT_PROJECT_STATUSES.includes(body.status)) {
      errors.push("Invalid status");
    } else {
      patch.status = body.status;
    }
  }
  if (body.startedAt !== undefined) {
    patch.startedAt = body.startedAt
      ? parseDate(body.startedAt, "start date", errors)
      : null;
  }
  if (body.targetDate !== undefined) {
    patch.targetDate = body.targetDate
      ? parseDate(body.targetDate, "target date", errors)
      : null;
  }
  return { ok: !errors.length, errors, patch };
}

export function parseCurrentProjectSort(searchParams) {
  const sortBy = searchParams.get("sortBy") || "updatedAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
  const map = {
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    title: "title",
    status: "status",
    targetDate: "targetDate",
  };
  const field = map[sortBy] || "updatedAt";
  return { [field]: sortOrder };
}
