import { sanitizeRichTextHtml } from "./sanitize.js";
import { isRichTextEmpty } from "./plain-text.js";

/** Sanitize editor HTML and collapse empty rich-text to an empty string for storage. */
export function prepareRichTextForStorage(value) {
  if (value == null || value === "") {
    return "";
  }
  const sanitized = sanitizeRichTextHtml(String(value));
  if (isRichTextEmpty(sanitized)) {
    return "";
  }
  return sanitized;
}
