import { limitRichText } from "@/lib/rich-text/field.js";
import { isRichTextEmpty } from "@/lib/rich-text/plain-text.js";
import { MAX_DESK_NOTE_CONTENT_LENGTH } from "./constants.js";
import { deriveDeskNoteTitle } from "./title.js";

function limitContent(value) {
  return limitRichText(value, MAX_DESK_NOTE_CONTENT_LENGTH);
}

export function validateDeskNoteCreate(body) {
  const errors = [];
  const content = limitContent(body?.content);
  if (isRichTextEmpty(content)) {
    errors.push("Note cannot be empty");
  }
  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : deriveDeskNoteTitle(content);
  return {
    errors,
    value: { title, content },
  };
}

export function validateDeskNoteUpdate(body) {
  const errors = [];
  const patch = {};
  if (body?.content !== undefined) {
    const content = limitContent(body.content);
    if (isRichTextEmpty(content)) {
      errors.push("Note cannot be empty");
    } else {
      patch.content = content;
      if (body.title === undefined) {
        patch.title = deriveDeskNoteTitle(content);
      }
    }
  }
  if (body?.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      errors.push("Title cannot be empty");
    } else {
      patch.title = title.slice(0, 200);
    }
  }
  return { errors, patch };
}
