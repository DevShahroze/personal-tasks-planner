function decodeBasicEntities(text) {
  return String(text || "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/** Allow only safe URL schemes for rich-text links. */
export function sanitizeRichTextLinkHref(raw) {
  const href = decodeBasicEntities(String(raw || "").trim());
  if (!href) {
    return "";
  }
  const compact = href.replace(/\s+/g, "").toLowerCase();
  if (
    compact.startsWith("javascript:") ||
    compact.startsWith("vbscript:") ||
    compact.startsWith("data:") ||
    compact.includes("javascript:")
  ) {
    return "";
  }
  if (href.startsWith("//")) {
    return "";
  }
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) {
    return href;
  }
  return "";
}
