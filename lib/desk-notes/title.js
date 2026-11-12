import { richTextToPlainText } from "@/lib/rich-text/plain-text.js";

export function deriveDeskNoteTitle(content) {
  const trimmed = richTextToPlainText(content).trim();
  if (!trimmed) {
    return "Untitled";
  }
  const words = trimmed.split(/\s+/).slice(0, 8).join(" ");
  if (words.length <= 60) {
    return words;
  }
  return `${words.slice(0, 57)}…`;
}
