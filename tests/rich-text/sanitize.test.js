import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRichTextHtml } from "../../lib/rich-text/sanitize.js";
import { limitRichText } from "../../lib/rich-text/field.js";
import { prepareRichTextForStorage } from "../../lib/rich-text/normalize.js";
import { sanitizeRichTextLinkHref } from "../../lib/rich-text/links.js";
import { isRichTextEmpty } from "../../lib/rich-text/plain-text.js";

test("sanitizeRichTextHtml strips scripts and event handlers", () => {
  const out = sanitizeRichTextHtml(
    '<p onclick="alert(1)">Hi</p><script>alert(1)</script><iframe src="x"></iframe>',
  );
  assert.equal(out.includes("script"), false);
  assert.equal(out.includes("onclick"), false);
  assert.equal(out.includes("iframe"), false);
  assert.match(out, /<p>Hi<\/p>/);
});

test("sanitizeRichTextHtml blocks javascript links", () => {
  const out = sanitizeRichTextHtml(
    '<a href="javascript:alert(1)">bad</a><a href="https://example.com">ok</a>',
  );
  assert.equal(out.includes("javascript"), false);
  assert.match(out, /href="https:\/\/example.com"/);
  assert.match(out, /rel="noopener noreferrer"/);
});

test("sanitizeRichTextLinkHref decodes obfuscated javascript", () => {
  assert.equal(sanitizeRichTextLinkHref("javascript:alert(1)"), "");
  assert.equal(sanitizeRichTextLinkHref("&#106;avascript:alert(1)"), "");
  assert.equal(
    sanitizeRichTextLinkHref("https://example.com/path"),
    "https://example.com/path",
  );
  assert.equal(sanitizeRichTextLinkHref("/tasks"), "/tasks");
});

test("prepareRichTextForStorage collapses empty editor noise", () => {
  assert.equal(prepareRichTextForStorage("<p><br></p>"), "");
  assert.equal(isRichTextEmpty("<p><br></p>"), true);
  assert.match(prepareRichTextForStorage("<p><strong>x</strong></p>"), /x/);
});

test("limitRichText sanitizes on save", () => {
  const stored = limitRichText('<img onerror="x" src=y><p>Safe</p>', 5000);
  assert.equal(stored.includes("img"), false);
  assert.match(stored, /Safe/);
});
