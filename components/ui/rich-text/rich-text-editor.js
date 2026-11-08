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
      syncHidden(bodyRef.current.innerHTML);
    }
  }, [syncHidden]);

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

  useEffect(() => {
    const host = hostRef.current;
    if (!host || bodyRef.current) {
      return undefined;
    }

    const root = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    const body = document.createElement("div");
    body.className = "rte-body";
    body.setAttribute("data-placeholder", placeholder);
    body.contentEditable = String(!disabled && !readOnly);
    body.setAttribute("aria-multiline", "true");
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-labelledby", inputId);
    root.appendChild(style);
    root.appendChild(body);
    styleRef.current = style;
    bodyRef.current = body;

    const initial = isControlled ? value : defaultValue;
    setEditorHtml(body, initial);
    syncHidden(body.innerHTML);

    const onInput = () => {
      if (syncingRef.current) {
        return;
      }
      syncHidden(body.innerHTML);
    };
    const onBlur = () => flushEditor();

    body.addEventListener("input", onInput);
    body.addEventListener("blur", onBlur);
    return () => {
      body.removeEventListener("input", onInput);
      body.removeEventListener("blur", onBlur);
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
    const lineRem = 1.5;
    const rowCount = Math.max(3, rows);
    const scrollRows = maxRowsRef.current ?? Math.max(rowCount * 3, 10);
    body.style.setProperty("--rte-min-height", `${rowCount * lineRem}rem`);
    body.style.setProperty(
      "--rte-max-height",
      `${Math.min(scrollRows * lineRem, 28)}rem`,
    );
    body.contentEditable = String(!disabled && !readOnly);
    body.setAttribute("data-placeholder", placeholder);
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [disabled, editorGeneration, placeholder, readOnly, rows]);

  useEffect(() => {
    if (!isControlled || !bodyRef.current) {
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
      className={`overflow-hidden rounded-md border border-border bg-input focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40 ${disabled ? "opacity-50" : ""} ${className}`.trim()}
    >
      <span id={inputId} className="sr-only">
        {name || "Rich text"}
      </span>
      {!toolbarDisabled ? (
        <div
          className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1 py-0.5"
          role="toolbar"
          aria-label="Formatting"
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
        className="min-h-0"
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
