import { MAX_DESCRIPTION_LENGTH } from "../security/constants.js";

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function parseTaskNoteVisitYmd(value) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, date: null };
  }
  if (typeof value !== "string") {
    return { ok: false, error: "Visit date must be YYYY-MM-DD" };
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Visit date must be YYYY-MM-DD" };
  }
  const date = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Invalid visit date" };
  }
  return { ok: true, date };
}

export function validateTaskNoteCreate(body) {
  const errors = [];
  const visitParsed = parseTaskNoteVisitYmd(body.visitDate);
  if (!visitParsed.ok) {
    errors.push(visitParsed.error);
  }
  const content = limitString(body.content ?? "", MAX_DESCRIPTION_LENGTH);
  if (!visitParsed.date && !content) {
    errors.push("Note content is required");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return {
    ok: true,
    errors: [],
    value: { content, visitDate: visitParsed.date },
  };
}

export function validateTaskNoteUpdate(body) {
  const errors = [];
  const patch = {};
  if (body.content !== undefined) {
    const content = limitString(body.content, MAX_DESCRIPTION_LENGTH);
    if (!content) {
      errors.push("Note content cannot be empty");
    } else {
      patch.content = content;
    }
  }
  return { ok: !errors.length, errors, patch };
}
