"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Input from "@/components/ui/input";

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  allowEmpty = true,
  emptyOptionLabel = "None",
  ariaLabel,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const listId = useId();

  const selectedLabel = useMemo(() => {
    if (!value) {
      return allowEmpty ? emptyOptionLabel : "";
    }
    return options.find((option) => option.value === value)?.label || placeholder;
  }, [allowEmpty, emptyOptionLabel, options, placeholder, value]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onDocumentMouseDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open]);

  const pick = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        className="relative z-0 flex w-full items-center justify-between rounded-md border border-border bg-input px-2.5 py-1.5 text-left text-base text-foreground transition-[border-color,box-shadow,z-index] duration-150 focus:z-50 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
      >
        <span className={value ? "" : "text-muted-foreground"}>{selectedLabel}</span>
        <span className="text-muted-foreground" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border border-border bg-card p-2 shadow-lg">
          <Input
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="mb-2"
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul
            id={listId}
            role="listbox"
            className="max-h-48 overflow-y-auto text-sm"
            aria-label={ariaLabel}
          >
            {allowEmpty ? (
              <li role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={`w-full rounded px-2 py-1.5 text-left hover:bg-muted ${
                    !value ? "bg-accent text-accent-foreground" : ""
                  }`}
                  onClick={() => pick("")}
                >
                  {emptyOptionLabel}
                </button>
              </li>
            ) : null}
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    className={`w-full rounded px-2 py-1.5 text-left hover:bg-muted ${
                      value === option.value ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => pick(option.value)}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">No matches</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
