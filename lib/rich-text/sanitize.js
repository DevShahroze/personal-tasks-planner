import { sanitizeRichTextLinkHref } from "./links.js";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "span",
  "div",
  "hr",
]);

const TAGS_WITH_STYLE = new Set(["span", "div", "p", "h1", "h2", "h3", "h4", "a"]);

const STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
]);

const UNSAFE_STYLE =
  /(url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding)/i;

function decodeBasicEntities(text) {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function sanitizeStyleValue(raw) {
  const value = decodeBasicEntities(String(raw || "").trim());
  if (!value || UNSAFE_STYLE.test(value)) {
    return "";
  }
  return value;
}

function sanitizeStyleAttr(raw) {
  if (!raw) {
    return "";
  }
  const decoded = decodeBasicEntities(raw);
  const parts = decoded.split(";");
  const kept = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) {
      continue;
    }
    const prop = part.slice(0, idx).trim().toLowerCase();
    if (!STYLE_PROPS.has(prop)) {
      continue;
    }
    const val = sanitizeStyleValue(part.slice(idx + 1));
    if (val) {
      kept.push(`${prop}: ${val}`);
    }
  }
  if (!kept.length) {
    return "";
  }
  return ` style="${kept.join("; ")}"`;
}

function sanitizeHref(raw) {
  const href = sanitizeRichTextLinkHref(raw);
  if (!href) {
    return "";
  }
  return ` href="${href.replace(/"/g, "&quot;")}" rel="noopener noreferrer"`;
}

function sanitizeOpenTag(tag, attrString) {
  const attrs = [];
  const attrRe = /([a-zA-Z][\w-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match = attrRe.exec(attrString);
  while (match) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (name.startsWith("on")) {
      match = attrRe.exec(attrString);
      continue;
    }
    if (name === "href" && tag === "a") {
      const href = sanitizeHref(value);
      if (href) {
        attrs.push(href.trim());
      }
    } else if (name === "style" && TAGS_WITH_STYLE.has(tag)) {
      const style = sanitizeStyleAttr(value);
      if (style) {
        attrs.push(style.trim());
      }
    } else if (name === "target" && tag === "a" && value === "_blank") {
      attrs.push('target="_blank"');
    }
    match = attrRe.exec(attrString);
  }
  return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
}

/** Server- and client-safe HTML allowlist sanitizer. */
export function sanitizeRichTextHtml(dirty) {
  if (dirty == null || dirty === "") {
    return "";
  }
  let html = String(dirty).replace(/\0/g, "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(
    /<(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
  html = html.replace(
    /<(script|style|iframe|object|embed|form|input|button|meta|link|base)\b[^>]*\/?>/gi,
    "",
  );

  return html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (match, tagName, attrPart) => {
      const tag = tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }
      if (match.startsWith("</")) {
        return `</${tag}>`;
      }
      if (tag === "br" || tag === "hr") {
        return `<${tag}>`;
      }
      return sanitizeOpenTag(tag, attrPart);
    },
  );
}
