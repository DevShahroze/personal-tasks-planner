export const RICH_TEXT_ISLAND_CSS = `
:host {
  display: block;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--rte-fg, #171717);
  background: var(--rte-bg, transparent);
}
.rte-body {
  outline: none;
  min-height: var(--rte-min-height, 6rem);
  max-height: min(var(--rte-max-height, 24rem), 50vh);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.375rem 0.625rem;
  word-break: break-word;
}
.rte-body:empty::before {
  content: attr(data-placeholder);
  color: var(--rte-placeholder, #737373);
  pointer-events: none;
}
.rte-body * {
  font: inherit;
  color: inherit;
}
.rte-body p {
  margin: 0 0 0.5em;
}
.rte-body p:last-child {
  margin-bottom: 0;
}
.rte-body h1 { font-size: 1.5em; font-weight: 700; margin: 0.5em 0; }
.rte-body h2 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0; }
.rte-body h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0; }
.rte-body h4 { font-size: 1em; font-weight: 600; margin: 0.4em 0; }
.rte-body ul, .rte-body ol {
  margin: 0.25em 0 0.5em;
  padding-left: 1.5em;
}
.rte-body li {
  margin: 0.15em 0;
}
.rte-body blockquote {
  margin: 0.5em 0;
  padding-left: 0.75em;
  border-left: 3px solid var(--rte-border, #d4d4d4);
  opacity: 0.95;
}
.rte-body a {
  color: var(--rte-link, #2563eb);
  text-decoration: underline;
}
.rte-body hr {
  border: none;
  border-top: 1px solid var(--rte-border, #d4d4d4);
  margin: 0.75em 0;
}
`;

export const RICH_TEXT_ISLAND_DARK_VARS = `
:host {
  --rte-fg: #fafafa;
  --rte-placeholder: #a3a3a3;
  --rte-border: #525252;
  --rte-link: #60a5fa;
}
`;

export const RICH_TEXT_ISLAND_LIGHT_VARS = `
:host {
  --rte-fg: #171717;
  --rte-placeholder: #737373;
  --rte-border: #d4d4d4;
  --rte-link: #2563eb;
}
`;
