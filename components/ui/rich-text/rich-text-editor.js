"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { prepareRichTextForStorage } from "@/lib/rich-text/normalize";
import { sanitizeRichTextHtml } from "@/lib/rich-text/sanitize";
import { sanitizeRichTextLinkHref } from "@/lib/rich-text/links";
import {
  RICH_TEXT_ISLAND_CSS,
  RICH_TEXT_ISLAND_DARK_VARS,
  RICH_TEXT_ISLAND_LIGHT_VARS,
} from "@/components/ui/rich-text/island-styles";

function isLikelyHtml(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ""));
}

function setEditorHtml(body, raw) {
  const value = String(raw || "");
  if (!value) {
    body.innerHTML = "";
    return;
  }
  if (!isLikelyHtml(value)) {
    body.textContent = value;
    return;
  }
  body.innerHTML = sanitizeRichTextHtml(value);
}

const FONT_SIZE_PX_OPTIONS = ["12", "14", "16", "18", "20", "24", "28", "32"];
const FONT_SIZE_PX_SET = new Set(FONT_SIZE_PX_OPTIONS);

function getEditorSelection(body) {
  if (!body) {
    return null;
  }
  const root = body.getRootNode();
  if (root instanceof ShadowRoot && typeof root.getSelection === "function") {
    return root.getSelection();
  }
  return body.ownerDocument.getSelection();
}

function rangeInEditorBody(body, range) {
  if (!body || !range) {
    return false;
  }
  let node = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }
  while (node) {
    if (node === body) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

function parseInlineFontSizePx(styleValue) {
  const raw = String(styleValue || "")
    .trim()
    .toLowerCase();
  const match = raw.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) {
    return "";
  }
  return String(Math.round(Number(match[1])));
}

function detectFontSizePxAtSelection(body) {
  const selection = getEditorSelection(body);
  if (!body || !selection?.rangeCount) {
    return "";
  }
  const range = selection.getRangeAt(0);
  if (!rangeInEditorBody(body, range)) {
    return "";
  }
  let node = selection.anchorNode;
  if (!node) {
    return "";
  }
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }
  while (node && node !== body) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const inline = parseInlineFontSizePx(node.style.fontSize);
      if (inline && FONT_SIZE_PX_SET.has(inline)) {
        return inline;
      }
    }
    node = node.parentNode;
  }
  return "";
}

function pickFormattingRange(body, savedRange) {
  const selection = getEditorSelection(body);
  let range = null;
  if (selection?.rangeCount) {
    const live = selection.getRangeAt(0);
    if (rangeInEditorBody(body, live)) {
      range = live.cloneRange();
    }
  }
  if (
    (!range || range.collapsed) &&
    savedRange &&
    !savedRange.collapsed &&
    rangeInEditorBody(body, savedRange)
  ) {
    range = savedRange.cloneRange();
  }
  return range;
}

function FontSizeMenu({ value, onPick, onReset, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const close = (event) => {
      if (rootRef.current?.contains(event.target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const label = value === "pick" ? "Size" : `${value}px`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        title="Font size"
        aria-label="Font size"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`rounded border border-border bg-card px-1.5 py-0.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 ${
          value !== "pick" ? "text-primary" : ""
        }`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        {label}
      </button>
      {open ? (
        <ul
          className="absolute left-0 top-full z-30 mt-0.5 max-h-48 min-w-[5rem] overflow-y-auto rounded border border-border bg-card py-0.5 shadow-md"
          role="listbox"
          aria-label="Font size options"
        >
          {FONT_SIZE_PX_OPTIONS.map((px) => (
            <li key={px}>
              <button
                type="button"
                role="option"
                aria-selected={value === px}
                className={`block w-full px-2 py-0.5 text-left text-xs hover:bg-muted ${
                  value === px
                    ? "bg-muted font-semibold text-foreground"
                    : "text-foreground"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onPick(px);
                  setOpen(false);
                }}
              >
                {px}px
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="block w-full border-t border-border px-2 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onReset();
                setOpen(false);
              }}
            >
              Reset
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function ToolbarButton({ title, onClick, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded px-1.5 py-0.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  name,
  id: idProp,
  defaultValue = "",
  value,
  onChange,
  rows = 4,
  /** Visible line budget before the editor scrolls (~1.5rem per row). */
  maxRows = null,
  placeholder = "",
  className = "",
  disabled = false,
  readOnly = false,
  required = false,
  /** Change when loaded entity changes so the editor remounts with fresh HTML. */
  resetKey = "",
  form: formId,
  /** Registers a flush function that syncs the DOM and returns stored HTML. */
  onBindFlush = null,
  /** Use viewport-based min/max height (Notes) instead of the default 50vh cap. */
  tall = false,
  tallMinHeight = "calc(100dvh - 14rem)",
}) {
  const autoId = useId();
  const inputId = idProp || (name ? `rte-${name}` : `rte-${autoId}`);
  const wrapperRef = useRef(null);
  const hostRef = useRef(null);
  const hiddenRef = useRef(null);
  const bodyRef = useRef(null);
  const styleRef = useRef(null);
  const syncingRef = useRef(false);
  const isControlled = value !== undefined;
  const [editorGeneration, setEditorGeneration] = useState(0);
  const lastResetKeyRef = useRef(resetKey);
  const maxRowsRef = useRef(maxRows);
  const savedRangeRef = useRef(null);
  const fontSizeLabelRef = useRef("pick");
  const [fontSizeSelectValue, setFontSizeSelectValue] = useState("pick");

  const saveSelection = useCallback(() => {
    const body = bodyRef.current;
    const selection = getEditorSelection(body);
    if (!body || !selection?.rangeCount) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!rangeInEditorBody(body, range)) {
      return;
    }
    savedRangeRef.current = range.cloneRange();
  }, []);

  const syncHidden = useCallback(
    (html) => {
      const stored = prepareRichTextForStorage(html);
      if (hiddenRef.current) {
        hiddenRef.current.value = stored;
      }
      if (onChange) {
        onChange({
          target: { name: name || "", value: stored, id: inputId },
        });
      }
    },
    [inputId, name, onChange],
  );

  const flushEditor = useCallback(() => {
    if (bodyRef.current) {
      const stored = prepareRichTextForStorage(bodyRef.current.innerHTML);
      syncHidden(bodyRef.current.innerHTML);
      return stored;
    }
    if (isControlled) {
      return prepareRichTextForStorage(value || "");
    }
    return prepareRichTextForStorage(hiddenRef.current?.value || defaultValue || "");
  }, [defaultValue, isControlled, syncHidden, value]);

  useEffect(() => {
    if (!onBindFlush) {
      return undefined;
    }
    onBindFlush(flushEditor);
    return () => {
      flushEditor();
      onBindFlush(null);
    };
  }, [flushEditor, onBindFlush]);

  useEffect(() => {
    if (lastResetKeyRef.current === resetKey) {
      return undefined;
    }
    lastResetKeyRef.current = resetKey;
    bodyRef.current = null;
    styleRef.current = null;
    setEditorGeneration((n) => n + 1);
    return undefined;
  }, [resetKey]);

  const exec = useCallback(
    (command, arg) => {
      const body = bodyRef.current;
      if (!body || disabled || readOnly) {
        return;
      }
      body.focus();
      try {
        document.execCommand(command, false, arg);
      } catch {
        // ignore unsupported commands
      }
      syncHidden(body.innerHTML);
    },
    [disabled, readOnly, syncHidden],
  );

  const setFontSizeLabel = useCallback((next) => {
    const label = next || "pick";
    if (fontSizeLabelRef.current === label) {
      return;
    }
    fontSizeLabelRef.current = label;
    setFontSizeSelectValue(label);
  }, []);

  const commitBodyHtml = useCallback(
    (html) => {
      syncingRef.current = true;
      syncHidden(html);
      syncingRef.current = false;
    },
    [syncHidden],
  );

  const applyFontSize = useCallback(
    (sizePx) => {
      const body = bodyRef.current;
      if (!body || disabled || readOnly) {
        return;
      }
      const range = pickFormattingRange(body, savedRangeRef.current);
      if (!range) {
        return;
      }
      const doc = body.ownerDocument;
      const selection = getEditorSelection(body);
      body.focus();
      selection?.removeAllRanges();
      selection?.addRange(range);
      if (!sizePx) {
        try {
          doc.execCommand("removeFormat", false);
        } catch {
          // ignore
        }
        commitBodyHtml(body.innerHTML);
        setFontSizeLabel("pick");
        return;
      }
      const span = doc.createElement("span");
      span.style.fontSize = `${sizePx}px`;
      if (range.collapsed) {
        range.insertNode(span);
        const cursor = doc.createRange();
        cursor.setStart(span, 0);
        cursor.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(cursor);
      } else {
        try {
          range.surroundContents(span);
        } catch {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        }
        const wrapped = doc.createRange();
        wrapped.selectNodeContents(span);
        selection?.removeAllRanges();
        selection?.addRange(wrapped);
        savedRangeRef.current = wrapped.cloneRange();
      }
      commitBodyHtml(body.innerHTML);
      setFontSizeLabel(String(sizePx));
    },
    [commitBodyHtml, disabled, readOnly, setFontSizeLabel],
  );

  const refreshFontSizeSelect = useCallback(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    setFontSizeLabel(detectFontSizePxAtSelection(body));
  }, [setFontSizeLabel]);

  const applyEditorBodyLayout = useCallback(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    const lineRem = 1.5;
    const rowCount = Math.max(3, rows);
    const scrollRows = maxRowsRef.current ?? Math.max(rowCount * 3, 10);
    if (tall) {
      body.setAttribute("data-tall", "true");
      body.style.setProperty("--rte-min-height", tallMinHeight);
      body.style.setProperty("--rte-max-height", tallMinHeight);
    } else {
      body.removeAttribute("data-tall");
      body.style.setProperty("--rte-min-height", `${rowCount * lineRem}rem`);
      body.style.setProperty(
        "--rte-max-height",
        `${Math.min(scrollRows * lineRem, 28)}rem`,
      );
    }
  }, [rows, tall, tallMinHeight]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return undefined;
    }

    let root = host.shadowRoot;
    if (!root) {
      root = host.attachShadow({ mode: "open" });
    }

    let style = styleRef.current;
    let body = bodyRef.current;
    if (!body?.isConnected || body.getRootNode() !== root) {
      style = root.querySelector("style");
      body = root.querySelector(".rte-body");
    }

    if (!body) {
      root.replaceChildren();
      style = document.createElement("style");
      body = document.createElement("div");
      body.className = "rte-body";
      root.appendChild(style);
      root.appendChild(body);

      const initial = isControlled ? value : defaultValue;
      setEditorHtml(body, initial);
      syncHidden(body.innerHTML);
    }

    styleRef.current = style;
    bodyRef.current = body;
    body.setAttribute("data-placeholder", placeholder);
    body.contentEditable = String(!disabled && !readOnly);
    body.setAttribute("aria-multiline", "true");
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-labelledby", inputId);

    const onInput = () => {
      if (syncingRef.current) {
        return;
      }
      syncHidden(body.innerHTML);
    };
    const onBlur = () => flushEditor();

    const onSelectionActivity = () => refreshFontSizeSelect();

    body.addEventListener("input", onInput);
    body.addEventListener("blur", onBlur);
    body.addEventListener("mouseup", onSelectionActivity);
    body.addEventListener("keyup", onSelectionActivity);

    applyEditorBodyLayout();

    return () => {
      body.removeEventListener("input", onInput);
      body.removeEventListener("blur", onBlur);
      body.removeEventListener("mouseup", onSelectionActivity);
      body.removeEventListener("keyup", onSelectionActivity);
      bodyRef.current = null;
      styleRef.current = null;
    };
  }, [
    defaultValue,
    disabled,
    editorGeneration,
    flushEditor,
    inputId,
    isControlled,
    placeholder,
    readOnly,
    applyEditorBodyLayout,
    refreshFontSizeSelect,
    syncHidden,
    value,
  ]);

  useEffect(() => {
    maxRowsRef.current = maxRows;
  }, [maxRows]);

  useEffect(() => {
    const style = styleRef.current;
    const body = bodyRef.current;
    if (!style || !body) {
      return undefined;
    }
    const applyTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      style.textContent = [
        dark ? RICH_TEXT_ISLAND_DARK_VARS : RICH_TEXT_ISLAND_LIGHT_VARS,
        RICH_TEXT_ISLAND_CSS,
      ].join("\n");
    };
    applyTheme();
    applyEditorBodyLayout();
    body.contentEditable = String(!disabled && !readOnly);
    body.setAttribute("data-placeholder", placeholder);
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [applyEditorBodyLayout, disabled, editorGeneration, placeholder, readOnly]);

  useEffect(() => {
    if (!isControlled || !bodyRef.current || syncingRef.current) {
      return undefined;
    }
    const current = prepareRichTextForStorage(bodyRef.current.innerHTML);
    const next = prepareRichTextForStorage(value || "");
    if (current === next) {
      return undefined;
    }
    syncingRef.current = true;
    setEditorHtml(bodyRef.current, next);
    syncHidden(bodyRef.current.innerHTML);
    syncingRef.current = false;
    return undefined;
  }, [isControlled, syncHidden, value]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return undefined;
    }
    const form = formId ? document.getElementById(formId) : wrapper.closest("form");
    if (!form) {
      return undefined;
    }
    const onSubmit = () => flushEditor();
    form.addEventListener("submit", onSubmit, { capture: true });
    return () => form.removeEventListener("submit", onSubmit, { capture: true });
  }, [editorGeneration, flushEditor, formId]);

  const onLink = () => {
    const url = window.prompt("Link URL (https://, mailto:, tel:, or /path)");
    if (!url) {
      return;
    }
    const safe = sanitizeRichTextLinkHref(url.trim());
    if (!safe) {
      window.alert("That link URL is not allowed.");
      return;
    }
    exec("createLink", safe);
  };

  const onForeColor = () => {
    const color = window.prompt("Text color (CSS value, e.g. #c00 or red)");
    if (!color) {
      return;
    }
    exec("foreColor", color.trim());
  };

  const toolbarDisabled = disabled || readOnly;

  const hiddenDefault = prepareRichTextForStorage(isControlled ? value : defaultValue);

  return (
    <div
      ref={wrapperRef}
      className={`rounded-md border border-border bg-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40 ${disabled ? "opacity-50" : ""} ${className}`.trim()}
    >
      <span id={inputId} className="sr-only">
        {name || "Rich text"}
      </span>
      {!toolbarDisabled ? (
        <div
          className="relative z-10 flex flex-wrap items-center gap-0.5 overflow-visible border-b border-border bg-muted/40 px-1 py-0.5"
          role="toolbar"
          aria-label="Formatting"
          onMouseDownCapture={() => saveSelection()}
        >
          <ToolbarButton title="Bold" onClick={() => exec("bold")}>
            B
          </ToolbarButton>
          <ToolbarButton title="Italic" onClick={() => exec("italic")}>
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton title="Underline" onClick={() => exec("underline")}>
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton title="Strikethrough" onClick={() => exec("strikeThrough")}>
            S
          </ToolbarButton>
          <span className="mx-0.5 text-muted-foreground">|</span>
          <ToolbarButton title="Heading 2" onClick={() => exec("formatBlock", "h2")}>
            H2
          </ToolbarButton>
          <ToolbarButton title="Heading 3" onClick={() => exec("formatBlock", "h3")}>
            H3
          </ToolbarButton>
          <FontSizeMenu
            value={fontSizeSelectValue}
            onPick={applyFontSize}
            onReset={() => applyFontSize("")}
          />
          <span className="mx-0.5 text-muted-foreground">|</span>
          <ToolbarButton
            title="Bullet list"
            onClick={() => exec("insertUnorderedList")}
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            onClick={() => exec("insertOrderedList")}
          >
            1. List
          </ToolbarButton>
          <span className="mx-0.5 text-muted-foreground">|</span>
          <ToolbarButton title="Link" onClick={onLink}>
            Link
          </ToolbarButton>
          <ToolbarButton title="Text color" onClick={onForeColor}>
            A
          </ToolbarButton>
          <ToolbarButton title="Clear formatting" onClick={() => exec("removeFormat")}>
            Clear
          </ToolbarButton>
        </div>
      ) : null}
      <div
        key={editorGeneration}
        ref={hostRef}
        className="min-h-0 w-full overflow-hidden"
        style={tall ? { minHeight: tallMinHeight } : undefined}
        onFocus={() => bodyRef.current?.focus()}
      />
      <input
        key={`hidden-${editorGeneration}`}
        ref={hiddenRef}
        type="hidden"
        name={name}
        defaultValue={hiddenDefault}
        data-rich-text-required={required ? "true" : undefined}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
