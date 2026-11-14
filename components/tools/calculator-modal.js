"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

const MAX_HISTORY = 30;

const KEY_TO_INPUT = {
  0: "0",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  ".": ".",
  "=": "=",
  Enter: "=",
  Backspace: "⌫",
};

const CODE_TO_INPUT = {
  Numpad0: "0",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  Numpad6: "6",
  Numpad7: "7",
  Numpad8: "8",
  Numpad9: "9",
  NumpadAdd: "+",
  NumpadSubtract: "-",
  NumpadMultiply: "*",
  NumpadDivide: "/",
  NumpadDecimal: ".",
  NumpadEnter: "=",
};

function resolveKeyboardInput(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }
  if (event.isComposing) {
    return null;
  }
  return KEY_TO_INPUT[event.key] ?? CODE_TO_INPUT[event.code] ?? null;
}

function sanitizePastedNumbers(text) {
  const raw = String(text ?? "");
  if (!raw) {
    return "";
  }
  if (!/^[\d.\s]+$/.test(raw)) {
    return "";
  }
  const compact = raw.replace(/\s/g, "");
  if (!compact || !/^[\d.]+$/.test(compact)) {
    return "";
  }
  const dotIndex = compact.indexOf(".");
  if (dotIndex === -1) {
    return compact;
  }
  return (
    compact.slice(0, dotIndex + 1) + compact.slice(dotIndex + 1).replace(/\./g, "")
  );
}

const PAD = [
  ["C", "⌫", "/", "*"],
  ["7", "8", "9", "-"],
  ["4", "5", "6", "+"],
  ["1", "2", "3", "="],
];

function safeEvaluate(expression) {
  const trimmed = String(expression || "").trim();
  if (!trimmed) {
    return null;
  }
  if (!/^[\d.+\-*/\s]+$/.test(trimmed)) {
    return null;
  }
  try {
    const value = Function(`"use strict"; return (${trimmed})`)();
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function formatResult(value) {
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}

export default function CalculatorModal({ open, onClose }) {
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState([]);
  const panelRef = useRef(null);
  const lastHistoryCommitRef = useRef({ line: "", at: 0 });

  const commitHistoryLine = useCallback((line) => {
    const now = Date.now();
    const prev = lastHistoryCommitRef.current;
    if (prev.line === line && now - prev.at < 120) {
      return;
    }
    lastHistoryCommitRef.current = { line, at: now };
    setHistory((items) => [line, ...items].slice(0, MAX_HISTORY));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const clearDisplay = useCallback(() => {
    setExpression("");
  }, []);

  const clearAll = useCallback(() => {
    setExpression("");
    setHistory([]);
  }, []);

  const applyKey = useCallback(
    (key) => {
      if (key === "C") {
        setExpression("");
        return;
      }
      if (key === "⌫") {
        setExpression((value) => value.slice(0, -1));
        return;
      }
      if (key === "=") {
        setExpression((current) => {
          const result = safeEvaluate(current);
          if (result == null) {
            return current;
          }
          const formatted = formatResult(result);
          commitHistoryLine(`${current.trim()} = ${formatted}`);
          return formatted;
        });
        return;
      }
      setExpression((value) => value + key);
    },
    [commitHistoryLine],
  );

  const handlePaste = useCallback((event) => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    const numeric = sanitizePastedNumbers(text);
    if (!numeric) {
      return;
    }
    event.preventDefault();
    setExpression((value) => value + numeric);
  }, []);

  const handlePanelKeyDownCapture = useCallback(
    (event) => {
      if (event.key === "Escape") {
        return;
      }
      const mapped = resolveKeyboardInput(event);
      if (!mapped) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      applyKey(mapped);
    },
    [applyKey],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <Modal open={open} title="Calculator" onClose={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="space-y-3 outline-none"
        onKeyDownCapture={handlePanelKeyDownCapture}
        onPaste={handlePaste}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">History</p>
          <div className="flex flex-wrap justify-end gap-1">
            <Button type="button" variant="ghost" onClick={clearHistory}>
              Clear history
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              Reset all
            </Button>
          </div>
        </div>
        <ul className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
          {history.length ? (
            history.map((line, index) => (
              <li key={`${line}-${index}`} className="font-mono tabular-nums">
                {line}
              </li>
            ))
          ) : (
            <li className="text-muted-foreground/80">No calculations yet</li>
          )}
        </ul>

        <div className="flex gap-2">
          <input
            readOnly
            value={expression}
            aria-label="Calculator display"
            onPaste={handlePaste}
            className="min-w-0 flex-1 rounded-md border border-border bg-input px-3 py-2 text-right font-mono text-lg tabular-nums"
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={clearDisplay}
          >
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {PAD.flat().map((key) => (
            <Button
              key={key}
              type="button"
              variant={key === "=" ? "primary" : "secondary"}
              className="min-h-10"
              onClick={() => applyKey(key)}
            >
              {key}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="col-span-3 min-h-10"
            onClick={() => applyKey("0")}
          >
            0
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10"
            onClick={() => applyKey(".")}
          >
            .
          </Button>
        </div>
      </div>
    </Modal>
  );
}
