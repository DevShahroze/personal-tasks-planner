import { MAX_DESCRIPTION_LENGTH } from "../security/constants.js";

function limitString(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function validateTaskNoteCreate(body) {
  const errors = [];
  const content = limitString(body.content, MAX_DESCRIPTION_LENGTH);
  if (!content) {
    errors.push("Note content is required");
  }
  if (errors.length) {
    return { ok: false, errors, value: null };
  }
  return { ok: true, errors: [], value: { content } };
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
