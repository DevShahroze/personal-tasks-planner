/** Strip HTML to plain text for search, comma-split helpers, and empty checks. */
export function richTextToPlainText(html) {
  if (html == null || html === "") {
    return "";
  }
  const s = String(html);
  if (!/<[a-z!/]/i.test(s)) {
    return s;
  }
  let text = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return text.replace(/\u00a0/g, " ");
}

export function isRichTextEmpty(html) {
  return !richTextToPlainText(html).trim();
}
