import { prepareRichTextForStorage } from "./normalize.js";
import { sanitizeRichTextHtml } from "./sanitize.js";

export function limitRichText(value, max) {
  if (typeof value !== "string") {
    return "";
  }
  const prepared = prepareRichTextForStorage(value);
  if (!prepared) {
    return "";
  }
  if (prepared.length <= max) {
    return prepared;
  }
  return prepareRichTextForStorage(sanitizeRichTextHtml(prepared.slice(0, max)));
}
