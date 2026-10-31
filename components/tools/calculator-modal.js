"use client";

import { useCallback, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";

const MAX_HISTORY = 30;

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

  const append = (key) => {
    if (key === "C") {
      setExpression("");
      return;
    }
    if (key === "⌫") {
      setExpression((value) => value.slice(0, -1));
      return;
    }
    if (key === "=") {
      const result = safeEvaluate(expression);
      if (result == null) {
        return;
      }
      const line = `${expression.trim()} = ${formatResult(result)}`;
      setHistory((items) => [line, ...items].slice(0, MAX_HISTORY));
      setExpression(formatResult(result));
      return;
    }
    setExpression((value) => value + key);
  };

  return (
    <Modal open={open} title="Calculator" onClose={onClose}>
      <div className="space-y-3">
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
              onClick={() => append(key)}
            >
              {key}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="col-span-3 min-h-10"
            onClick={() => append("0")}
          >
            0
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10"
            onClick={() => append(".")}
          >
            .
          </Button>
        </div>
      </div>
    </Modal>
  );
}
